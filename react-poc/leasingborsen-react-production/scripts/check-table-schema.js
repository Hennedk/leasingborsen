#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTableSchema() {
  try {
    console.log('🔍 Checking Database Schema...');
    console.log('===============================');
    
    // Get processing_jobs table structure
    const { data, error } = await supabase
      .rpc('get_table_schema', { table_name: 'processing_jobs' });
    
    if (error) {
      console.log('❌ Error getting schema:', error.message);
      
      // Alternative: Query information_schema
      console.log('\n🔍 Trying alternative schema query...');
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'processing_jobs')
        .eq('table_schema', 'public');
      
      if (colError) {
        console.log('❌ Alternative query failed:', colError.message);
        
        // Manual query using raw SQL
        console.log('\n🔍 Trying raw SQL query...');
        const { data: rawData, error: rawError } = await supabase
          .rpc('exec_sql', { 
            sql: `SELECT column_name, data_type, is_nullable 
                  FROM information_schema.columns 
                  WHERE table_name = 'processing_jobs' 
                  AND table_schema = 'public'
                  ORDER BY ordinal_position;`
          });
        
        if (rawError) {
          console.log('❌ Raw SQL failed:', rawError.message);
        } else {
          console.log('✅ Table columns:');
          rawData.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
          });
        }
      } else {
        console.log('✅ Table columns:');
        columns.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
        });
      }
    } else {
      console.log('✅ Schema data:', data);
    }
    
    // Let's also check what tables exist
    console.log('\n🔍 Checking available tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.log('❌ Error getting tables:', tablesError.message);
    } else {
      console.log('✅ Available tables:');
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkTableSchema();