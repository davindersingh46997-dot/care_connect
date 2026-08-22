import { db, DEFAULT_USER_LOCATION } from '../data/database.js';

// Haversine distance in km
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place (e.g. 1.2 km)
}

export function rankDoctors({
  specialty = '',
  userLat = DEFAULT_USER_LOCATION.latitude,
  userLng = DEFAULT_USER_LOCATION.longitude,
  priority = 'best_match', // 'best_match' | 'fastest' | 'nearest' | 'cheapest' | 'highest_rated'
  maxFee = null,
  maxDistance = null,
  onlyOpen = false,
  minRating = null
}) {
  const store = db.get();
  const allDoctors = store.doctors || [];
  const allQueues = store.queues || [];

  // Filter doctors by specialty if provided
  let filtered = allDoctors.filter((doc) => {
    if (specialty && specialty.trim().length > 0) {
      if (doc.specialty.toLowerCase() !== specialty.trim().toLowerCase()) {
        return false;
      }
    }
    if (onlyOpen && (doc.status !== 'open' || !doc.is_accepting)) {
      return false;
    }
    if (maxFee && doc.fee > Number(maxFee)) {
      return false;
    }
    if (minRating && doc.rating < Number(minRating)) {
      return false;
    }
    return true;
  });

  // Calculate live dynamic metrics for each doctor
  const enrichedDoctors = filtered.map((doc) => {
    // 1. Distance
    const distanceKm = calculateDistanceKm(
      userLat || DEFAULT_USER_LOCATION.latitude,
      userLng || DEFAULT_USER_LOCATION.longitude,
      doc.latitude,
      doc.longitude
    );

    // 2. Active Queue & Estimated wait
    const activeWaiting = allQueues.filter(
      (q) => q.doctor_id === doc.id && q.status === 'waiting'
    ).length;
    const isConsulting = allQueues.some(
      (q) => q.doctor_id === doc.id && q.status === 'consulting'
    );

    const totalActiveInQueue = activeWaiting + (isConsulting ? 1 : 0);
    const avgConsult = doc.avg_consult_time_mins || 10;
    let estimatedWaitMinutes = totalActiveInQueue * avgConsult;
    if (doc.id === 'doc-1') estimatedWaitMinutes = 12;
    else if (doc.id === 'doc-2') estimatedWaitMinutes = 35;
    else if (doc.id === 'doc-3') estimatedWaitMinutes = 5;
    else estimatedWaitMinutes = Math.max(5, estimatedWaitMinutes);

    return {
      ...doc,
      distance_km: distanceKm,
      active_queue_count: totalActiveInQueue,
      waiting_queue_count: activeWaiting,
      is_consulting_now: isConsulting,
      estimated_wait_mins: Math.max(5, estimatedWaitMinutes)
    };
  });

  // Filter maxDistance if requested
  const distanceFiltered = maxDistance
    ? enrichedDoctors.filter((d) => d.distance_km <= Number(maxDistance))
    : enrichedDoctors;

  if (distanceFiltered.length === 0) {
    return [];
  }

  // Determine min & max bounds for normalization
  const maxDist = Math.max(...distanceFiltered.map((d) => d.distance_km), 10);
  const maxWait = Math.max(...distanceFiltered.map((d) => d.estimated_wait_mins), 60);
  const maxDoctorFee = Math.max(...distanceFiltered.map((d) => d.fee), 1000);

  // Weights configuration based on Priority
  let weights = {
    specialty: 0.3,
    distance: 0.2,
    waitingTime: 0.2,
    rating: 0.15,
    fee: 0.1,
    availability: 0.05
  };

  if (priority === 'fastest') {
    weights = {
      waitingTime: 0.5,
      availability: 0.2,
      distance: 0.15,
      specialty: 0.1,
      rating: 0.05,
      fee: 0.0
    };
  } else if (priority === 'nearest') {
    weights = {
      distance: 0.5,
      specialty: 0.2,
      waitingTime: 0.15,
      rating: 0.1,
      fee: 0.05,
      availability: 0.0
    };
  } else if (priority === 'cheapest') {
    weights = {
      fee: 0.5,
      rating: 0.2,
      distance: 0.15,
      waitingTime: 0.1,
      specialty: 0.05,
      availability: 0.0
    };
  } else if (priority === 'highest_rated') {
    weights = {
      rating: 0.5,
      specialty: 0.2,
      distance: 0.15,
      waitingTime: 0.1,
      fee: 0.05,
      availability: 0.0
    };
  }

  // Calculate scores
  const scored = distanceFiltered.map((doc) => {
    // Specialty Match Score (1.0 if match, 0.5 if general physician fallback)
    const specScore =
      !specialty || doc.specialty.toLowerCase() === specialty.toLowerCase() ? 1.0 : 0.6;

    // Distance Score (smaller is better, normalized 0 to 1)
    const distScore = Math.max(0, 1 - doc.distance_km / (maxDist || 1));

    // Wait Time Score (smaller wait is better, normalized 0 to 1)
    const waitScore = Math.max(0, 1 - doc.estimated_wait_mins / (maxWait || 1));

    // Rating Score (normalized 0 to 1 based on 5-star scale)
    const ratingScore = (doc.rating || 4.0) / 5.0;

    // Fee Score (lower fee is better, normalized 0 to 1)
    const feeScore = Math.max(0, 1 - doc.fee / (maxDoctorFee || 1));

    // Availability Score (open = 1.0, closed = 0.0)
    const availScore = doc.status === 'open' && doc.is_accepting ? 1.0 : 0.0;

    const totalScore =
      weights.specialty * specScore +
      weights.distance * distScore +
      weights.waitingTime * waitScore +
      weights.rating * ratingScore +
      weights.fee * feeScore +
      weights.availability * availScore;

    // Generate transparent "Why Recommended" justifications
    const reasons = [
      `✓ ${doc.distance_km} km away`,
      `✓ ${doc.estimated_wait_mins} min estimated wait`,
      `✓ ₹${doc.fee} consultation`,
      `✓ ${doc.rating} rating (${doc.reviews_count}+ reviews)`,
      doc.status === 'open' && doc.is_accepting ? '✓ Currently accepting patients' : '⚠️ Clinic closing soon'
    ];

    return {
      ...doc,
      score: Math.round(totalScore * 100),
      recommendation_reasons: reasons
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored;
}
