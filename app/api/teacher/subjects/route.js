import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabase } from '@/lib/db';

// Return all subjects and their topics ordered by order_no
export async function GET() {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const supabase = getSupabase();
    const [{ data: subjects, error: subErr }, { data: topics, error: topErr }] = await Promise.all([
      supabase.from('subjects').select('*').order('id'),
      supabase.from('topics').select('*').order('order_no'),
    ]);

    if (subErr) throw subErr;
    if (topErr) throw topErr;

    return NextResponse.json({ subjects: subjects || [], topics: topics || [] });
  } catch (err) {
    console.error('Subjects fetch error:', err);
    return NextResponse.json({ error: 'Failed to load subjects.' }, { status: 500 });
  }
}

// Create a new subject
export async function POST(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { name, code } = await request.json();
    if (!name || !code) {
      return NextResponse.json({ error: 'Subject name and code are required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('subjects')
      .insert({ name: name.trim(), code: code.trim().toUpperCase() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ subject: data }, { status: 201 });
  } catch (err) {
    console.error('Create subject error:', err);
    return NextResponse.json({ error: 'Failed to create subject (code may already exist).' }, { status: 500 });
  }
}

// Delete a subject by id
export async function DELETE(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete subject error:', err);
    return NextResponse.json({ error: 'Failed to delete subject.' }, { status: 500 });
  }
}

