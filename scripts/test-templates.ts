#!/usr/bin/env ts-node

/**
 * Test script to verify templates are accessible
 */

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

async function testTemplates() {
  console.log('🧪 Testing Templates Accessibility\n');
  console.log('============================================================\n');

  try {
    // Step 1: Login to get auth token
    console.log('Step 1: Logging in to get auth token...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-user@example.com',
        password: 'TestPassword123!',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData: any = await loginResponse.json();
    const token = loginData.accessToken;
    console.log('✅ Login successful\n');

    // Step 2: Fetch templates
    console.log('Step 2: Fetching templates...');
    const templatesResponse = await fetch(`${API_URL}/templates`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!templatesResponse.ok) {
      throw new Error(`Templates fetch failed: ${templatesResponse.status}`);
    }

    const templates: any = await templatesResponse.json();
    console.log(`✅ Templates fetched: ${templates.length} templates found\n`);

    // Step 3: Display template summary
    console.log('============================================================');
    console.log('TEMPLATE SUMMARY');
    console.log('============================================================\n');

    if (templates.length === 0) {
      console.log('❌ No templates found in the system\n');
      return;
    }

    // Group by category
    const byCategory: Record<string, any[]> = {};
    templates.forEach((t: any) => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = [];
      }
      byCategory[t.category].push(t);
    });

    Object.entries(byCategory).forEach(([category, temps]) => {
      console.log(`\n📁 ${category} (${temps.length} templates)`);
      console.log('─'.repeat(60));
      temps.forEach((t: any) => {
        console.log(`  • ${t.name}`);
        console.log(`    ${t.description}`);
        console.log(`    Format: ${t.fileFormat} | Placeholders: ${t.placeholders.length} | Active: ${t.isActive}`);
      });
    });

    console.log('\n============================================================');
    console.log(`✅ Total: ${templates.length} templates available`);
    console.log('============================================================\n');

    // Step 4: Test template detail endpoint
    if (templates.length > 0) {
      const firstTemplate = templates[0];
      console.log(`\nStep 3: Testing template detail endpoint for "${firstTemplate.name}"...`);
      
      const detailResponse = await fetch(`${API_URL}/templates/${firstTemplate.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!detailResponse.ok) {
        throw new Error(`Template detail fetch failed: ${detailResponse.status}`);
      }

      const detail: any = await detailResponse.json();
      console.log('✅ Template detail fetched successfully');
      console.log(`   ID: ${detail.id}`);
      console.log(`   Name: ${detail.name}`);
      console.log(`   Category: ${detail.category}`);
      console.log(`   File: ${detail.fileName}`);
      console.log(`   Placeholders: ${detail.placeholders.length}`);
    }

    console.log('\n============================================================');
    console.log('✅ ALL TEMPLATE TESTS PASSED');
    console.log('============================================================\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testTemplates();
