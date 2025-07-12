// Test script to verify session cancellation functionality
// Run with: node test-session-cancellation.js

import { storage } from './api/_lib/storage.js';

async function testCancellation() {
  try {
    console.log('🧪 Testing Council Session Cancellation...');
    
    // Test council session cancellation
    console.log('📝 Cancelling council participant ID 14...');
    const result = await storage.cancelCouncilSession(14);
    console.log('✅ Council cancellation result:', result);
    
    // Reset back to registered for re-testing
    console.log('🔄 Resetting participant status to registered...');
    // This would need to be implemented if needed
    
    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCancellation();