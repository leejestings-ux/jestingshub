import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vjpujincktcpxnorfgez.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcHVqaW5ja3RjcHhub3JmZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODE2MjQsImV4cCI6MjA4MzU1NzYyNH0.3VerE_yChawbS_9m5VW42VHVFRCGPPGhmDT8VZ6V-kY'
);

export default async function handler(req, res) {
  try {
    // Fetch reminders from Supabase
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('completed', false)
      .order('date', { ascending: true });

    if (error) throw error;

    // Build ICS content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JestingsHub//Reminders//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:JestingsHub Reminders',
      'X-WR-TIMEZONE:America/New_York'
    ];

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    reminders.forEach(r => {
      const dateStr = r.date.replace(/-/g, '');
      const uid = `${r.id}@jestingshub`;
      
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `SUMMARY:${escapeICS(r.title)}`,
        r.notes ? `DESCRIPTION:${escapeICS(r.notes)}` : '',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-P1D',
        `DESCRIPTION:Reminder: ${escapeICS(r.title)}`,
        'END:VALARM',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');
    
    // Filter empty lines and join
    const icsString = icsContent.filter(line => line).join('\r\n');

    // Set headers for ICS file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="jestingshub.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).send(icsString);
  } catch (err) {
    console.error('Calendar error:', err);
    return res.status(500).json({ error: 'Failed to generate calendar' });
  }
}

function escapeICS(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}
