import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://screencraft:screencraft_dev@localhost:5432/screencraft';

export const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function testConnection() {
  try {
    const result = await sql`SELECT 1 as connected`;
    return result[0]?.connected === 1;
  } catch {
    return false;
  }
}
