export function syllabusDemo(startDate: string) {
  const [year, month, day] = startDate.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + 6, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return {
    course: 'Demo · Computer Networks', assignee: 'Demo teacher',
    start_date: startDate, end_date: target.toISOString().slice(0, 10),
    topics: [
      {title:'Introduction to computer networks',lectures:1,preparation:'Explain LAN and WAN using the college network as an example.'},
      {title:'Network layers and protocols',lectures:2,preparation:'Draw OSI and TCP/IP layers; ask students to match example protocols.'},
      {title:'IP addressing and subnetting',lectures:3,preparation:'Prepare subnet-mask and host-range practice questions.'},
      {title:'Routing fundamentals',lectures:2,preparation:'Trace a packet between two networks on a whiteboard.'},
    ],
    slots:[{weekday:0,starts:'09:00',minutes:60},{weekday:2,starts:'09:00',minutes:60}],
    holidays:[startDate], reminder_minutes:60,
  };
}
