import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';

// ==========================================
// DB Connection Configuration (Example)
// ==========================================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * ============================================================================
 * OPTION 1: NEXT.JS PAGES ROUTER (e.g., pages/api/users/[id].js)
 * ============================================================================
 */
export async function pagesRouterHandler(req, res) {
  // Ensure only PUT requests are processed
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 2. Validate the WHERE Clause ID
    // Extract ID from query params (e.g., /api/users/[id]), the body, or a session
    const userId = req.query?.id || req.body?.id;
    if (!userId) {
      return res.status(400).json({ error: "Bad Request: Missing or invalid User ID" });
    }

    // 3. Check Body Parsing for Next.js Pages Router
    // req.body is pre-parsed by Next.js. We destruct only the fields we expect to update.
    const { name, email, role } = req.body || {};

    // Dynamic SQL construction to prevent passing 'undefined' values into the SET clause
    const updateFields = [];
    const queryParams = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      queryParams.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      queryParams.push(email);
    }
    if (role !== undefined) {
      updateFields.push('role = ?');
      queryParams.push(role);
    }

    // Guard: Ensure at least one field is provided for the update
    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Bad Request: No fields provided for update" });
    }

    // Append target ID for the WHERE clause
    queryParams.push(userId);

    const sqlQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    // Execute query
    const [result] = await pool.execute(sqlQuery, queryParams);

    // 4. Log the output object
    console.log("SQL_UPDATE_RESULT:", result);

    // 1. Check the "affectedRows" trap
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User ID not found in database" });
    }

    // Success response
    return res.status(200).json({ success: true, message: "User updated successfully" });

  } catch (error) {
    console.error("Database update error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * ============================================================================
 * OPTION 2: NEXT.JS APP ROUTER (e.g., app/api/users/[id]/route.js)
 * ============================================================================
 */
export async function PUT(request, { params }) {
  try {
    // 2. Validate the WHERE Clause ID
    // Path parameters in the App Router are extracted from the route context object
    const userId = params?.id;
    if (!userId) {
      return NextResponse.json({ error: "Bad Request: Missing User ID in path" }, { status: 400 });
    }

    // 3. Check Body Parsing for Next.js App Router
    // App Router requests must be parsed asynchronously using request.json()
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Bad Request: Invalid JSON body" }, { status: 400 });
    }

    const { name, email, role } = body || {};

    // Dynamic SQL construction to prevent passing 'undefined' values into the SET clause
    const updateFields = [];
    const queryParams = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      queryParams.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      queryParams.push(email);
    }
    if (role !== undefined) {
      updateFields.push('role = ?');
      queryParams.push(role);
    }

    // Guard: Ensure at least one field is provided for the update
    if (updateFields.length === 0) {
      return NextResponse.json({ error: "Bad Request: No fields provided for update" }, { status: 400 });
    }

    // Append target ID for the WHERE clause
    queryParams.push(userId);

    const sqlQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    // Execute query
    const [result] = await pool.execute(sqlQuery, queryParams);

    // 4. Log the output object
    console.log("SQL_UPDATE_RESULT:", result);

    // 1. Check the "affectedRows" trap
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "User ID not found in database" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User updated successfully" }, { status: 200 });

  } catch (error) {
    console.error("Database update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
