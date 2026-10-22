export interface PresetChat {
  id: string;
  name: string;
  description: string;
  text: string;
}

export const PRESETS: PresetChat[] = [
  {
    id: 'hackathon',
    name: 'Standard Chat Banter',
    description: 'Hinglish banter, mentions, hashtags, times, URLs, emoji, @everyone',
    text: `@everyone team update! Kal 5:30pm pe campus auditorium me meeting hai 🔥\nCheck repo https://github.com/vit-project/lexichat.git now! #ProjectDay2026 #VIT\nBhai submit before 11:59pm or we lose marks :eyes:`,
  },
  {
    id: 'delimiters',
    name: 'Delimiters & Rollback',
    description: 'URLs ending with periods, ports, IP hosts, and maximal munch rollback',
    text: `Check https://vit.ac.in/events. and http://192.168.1.1:8080/api now. Meeting with @eldo, @everyone! Valid refund: ₹50,000.`,
  },
  {
    id: 'study-group',
    name: 'Study Group & Code',
    description: 'Dates, ordinals, code spans, commands (/remind), percentages, shortcodes',
    text: `/remind exam on 12/10/2026 at 09:00am\nWe are 82% done with unit 3 on our 3rd attempt!\nRun \`npm run test\` to verify all test cases :thumbsup:`,
  },
  {
    id: 'marketplace',
    name: 'Marketplace & Currency',
    description: 'Currency (₹), phone numbers, emails, URLs, bold/strike pricing',
    text: `Selling iPad Air *urgent* price ~₹45,000~ ₹38,500 only!\nContact +91 9876543210 or mail seller.deals@vit.ac.in.\nFull specs at https://apple.com/ipad-air-m2.`,
  },
  {
    id: 'gen-z',
    name: 'Slang & Elongation',
    description: 'Elongation, slang, emoticons, ZWJ emoji, ALL CAPS, ellipses',
    text: `bro THIS is sooooo good lol... ngl best hackathon everrrr 👨‍💻 🔥\nWait are you srs rn XD ;)\n<3 tbh we definitely won no cap`,
  },
  {
    id: 'multilingual',
    name: 'Multilingual Unicode',
    description: 'English + Devanagari + Tamil + emoji',
    text: `Hello everyone! नमस्ते दोस्त, kal 5pm pe milte hain 🔥\nவணக்கம் நண்பா! All the best for #ProjectDay2026 🇮🇳`,
  },
  {
    id: 'error-lab',
    name: 'Panic-Mode Error Lab',
    description: 'Control chars, unterminated code spans, symbols',
    text: `Testing parser recovery: \`unterminated code span\nValid token after newline: @vit #test\nEmbedded null \x00 and bell \x07 characters with symbols & + = < > / \\`,
  },
  {
    id: 'stress-test',
    name: 'Throughput Stress Test',
    description: '20,000-character corpus testing sustained linear throughput',
    text: (() => {
      const base = 'hey @eldo check https://vit.ac.in/x. now!!! meet at 5:30pm ₹1,299.50 #VIT loooool :) `code` *bold* _italic_ ~strike~ ';
      return base.repeat(170); // ~20,000 chars
    })(),
  },
];
