import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabase } from '@/lib/db';

// Create a new topic inside a subject
export async function POST(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { subject_id, name, order_no, prerequisite_topic_id } = await request.json();
    if (!subject_id || !name) {
      return NextResponse.json({ error: 'Subject and topic name are required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('topics')
      .insert({
        subject_id: Number(subject_id),
        name: name.trim(),
        order_no: Number(order_no) || 1,
        prerequisite_topic_id: prerequisite_topic_id ? Number(prerequisite_topic_id) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ topic: data }, { status: 201 });
  } catch (err) {
    console.error('Create topic error:', err);
    return NextResponse.json({ error: 'Failed to create topic.' }, { status: 500 });
  }
}

// Update an existing topic (name, order_no, or prerequisite_topic_id)
export async function PUT(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { id, name, order_no, prerequisite_topic_id } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'Topic ID and name are required.' }, { status: 400 });
    }

    const prereqId = prerequisite_topic_id ? Number(prerequisite_topic_id) : null;
    if (prereqId === Number(id)) {
      return NextResponse.json({ error: 'A topic cannot be its own prerequisite.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('topics')
      .update({
        name: name.trim(),
        order_no: Number(order_no) || 1,
        prerequisite_topic_id: prereqId,
      })
      .eq('id', Number(id))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ topic: data });
  } catch (err) {
    console.error('Update topic error:', err);
    return NextResponse.json({ error: 'Failed to update topic.' }, { status: 500 });
  }
}

// Delete a topic by id
export async function DELETE(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete topic error:', err);
    return NextResponse.json({ error: 'Failed to delete topic.' }, { status: 500 });
  }
}

