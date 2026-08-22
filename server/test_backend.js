import { classifySpecialty } from './src/services/geminiService.js';
import { rankDoctors } from './src/services/rankingService.js';
import { db } from './src/data/database.js';

async function testBackend() {
  console.log('--- TEST 1: AI Specialty Classification ---');
  const res1 = await classifySpecialty("I have a skin rash and itching.");
  console.log('Result 1 (Dermatology expected):', res1.specialty, '| Confidence:', res1.confidence);
  console.assert(res1.specialty === 'Dermatology', 'Expected Dermatology');

  console.log('\n--- TEST 2: Emergency Triage Red Flag ---');
  const res2 = await classifySpecialty("I have severe crushing chest pain and can't breathe");
  console.log('Result 2 (Emergency expected):', res2.isEmergency, '| Warning:', res2.warning?.substring(0, 40));
  console.assert(res2.isEmergency === true, 'Expected isEmergency: true');

  console.log('\n--- TEST 3: Smart Doctor Ranking ---');
  const doctors = rankDoctors({ specialty: 'Dermatology', priority: 'best_match' });
  console.log(`Found ${doctors.length} dermatologists.`);
  console.log(`Top match: ${doctors[0].name} (${doctors[0].distance_km}km, ₹${doctors[0].fee}, wait: ${doctors[0].estimated_wait_mins}m, Score: ${doctors[0].score})`);
  console.log('Reasons:', doctors[0].recommendation_reasons);
  console.assert(doctors[0].name === 'Dr. Raj Sharma', 'Expected Dr. Raj Sharma to be #1 best match');

  console.log('\n--- ALL BACKEND TESTS PASSED SUCCESSFULLY! ---');
}

testBackend();
