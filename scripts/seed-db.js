#!/usr/bin/env node

/**
 * Script de seed pour peupler la base de données avec des données de test
 * Usage: node scripts/seed-db.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mangatech_user:mangatech_password@localhost:5432/mangatech'
});

const testMangas = [
  {
    title: 'One Piece',
    url: 'https://mangafox.com/one-piece',
    cover_url: 'https://example.com/one-piece.jpg',
    status: 'reading'
  },
  {
    title: 'Naruto',
    url: 'https://mangafox.com/naruto',
    cover_url: 'https://example.com/naruto.jpg',
    status: 'completed'
  },
  {
    title: 'Attack on Titan',
    url: 'https://mangafox.com/attack-on-titan',
    cover_url: 'https://example.com/aot.jpg',
    status: 'reading'
  }
];

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...\n');

    // Créer un utilisateur de test
    console.log('👤 Creating test user...');
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    
    const userResult = await client.query(`
      INSERT INTO users (email, password, username)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id, email, username
    `, ['test@mangatech.com', hashedPassword, 'testuser']);
    
    const userId = userResult.rows[0].id;
    console.log(`✅ User created: ${userResult.rows[0].email}\n`);

    // Ajouter des mangas
    console.log('📚 Adding test mangas...');
    for (const manga of testMangas) {
      const mangaResult = await client.query(`
        INSERT INTO mangas (user_id, title, url, cover_url, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title
      `, [userId, manga.title, manga.url, manga.cover_url, manga.status]);
      
      const mangaId = mangaResult.rows[0].id;
      console.log(`  ✅ ${manga.title}`);

      // Ajouter une progression de lecture
      await client.query(`
        INSERT INTO reading_progress (user_id, manga_id, current_chapter, current_page)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, manga_id) DO NOTHING
      `, [userId, mangaId, Math.floor(Math.random() * 100) + 1, 1]);
    }

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Test credentials:');
    console.log('  Email: test@mangatech.com');
    console.log('  Password: testpassword\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(console.error);
