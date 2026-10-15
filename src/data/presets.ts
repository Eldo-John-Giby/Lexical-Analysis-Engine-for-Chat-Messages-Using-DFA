export interface PresetChat {
  id: string;
  name: string;
  description: string;
  text: string;
  messages?: { sender: string; time: string; text: string; isUser?: boolean }[];
}

export const PRESETS: PresetChat[] = [
  {
    id: 'hackathon',
    name: 'Hackathon night',
    description: 'Hinglish banter, mentions, hashtags, times, URLs, emoji, @everyone',
    text: `@everyone team update! Kal 5:30pm pe campus auditorium me meeting hai 🔥\nCheck repo https://github.com/vit-project/lexichat.git now! #ProjectDay2026 #VIT\nBhai submit before 11:59pm or we lose marks :eyes:`,
    messages: [
      { sender: 'Aarav', time: '17:15', text: '@everyone team update! Kal 5:30pm pe campus auditorium me meeting hai 🔥' },
      { sender: 'Diya', time: '17:16', text: 'Check repo https://github.com/vit-project/lexichat.git now! #ProjectDay2026' },
      { sender: 'You', time: '17:18', text: 'Bhai submit before 11:59pm or we lose marks :eyes:', isUser: true },
    ],
  },
  {
    id: 'study-group',
    name: 'Study group',
    description: 'Dates, ordinals, code spans, commands (/remind), percentages, shortcodes',
    text: `/remind exam on 12/10/2026 at 09:00am\nWe are 82% done with unit 3 on our 3rd attempt!\nRun \`npm run test\` to verify all test cases :thumbsup:`,
    messages: [
      { sender: 'Rohan', time: '10:00', text: '/remind exam on 12/10/2026 at 09:00am' },
      { sender: 'Sneha', time: '10:02', text: 'We are 82% done with unit 3 on our 3rd attempt!' },
      { sender: 'You', time: '10:05', text: 'Run `npm run test` to verify all test cases :thumbsup:', isUser: true },
    ],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Currency, phone numbers, emails, URLs, bold/strike pricing',
    text: `Selling iPad Air *urgent* price ~₹45,000~ ₹38,500 only!\nContact +91 9876543210 or mail seller.deals@vit.ac.in.\nFull specs at https://apple.com/ipad-air-m2.`,
    messages: [
      { sender: 'Karan', time: '14:20', text: 'Selling iPad Air *urgent* price ~₹45,000~ ₹38,500 only!' },
      { sender: 'Karan', time: '14:21', text: 'Contact +91 9876543210 or mail seller.deals@vit.ac.in.' },
      { sender: 'You', time: '14:25', text: 'Full specs at https://apple.com/ipad-air-m2.', isUser: true },
    ],
  },
  {
    id: 'phishing',
    name: 'Phishing attempt',
    description: 'Suspicious URLs (IP-style host, long path), urgency caps, !!!, fake phone, broadcast mention',
    text: `@everyone URGENT SECURITY ALERT!!! Your bank account is locked! Call +1 8005550199 IMMEDIATELY or verify login at http://192.168.1.100/auth/secure-login-gateway-verify-credentials-now-account-protection-portal/token=992817109281298410298301984209124809182409182409182049182049182094182904812049810294810294812. Claim ₹50,000 refund now!!!`,
    messages: [
      { sender: 'SecurityBot', time: '02:14', text: '@everyone URGENT SECURITY ALERT!!! Your bank account is locked!' },
      { sender: 'SecurityBot', time: '02:14', text: 'Call +1 8005550199 IMMEDIATELY or verify login at http://192.168.1.100/auth/secure-login-gateway-verify-credentials-now-account-protection-portal/token=992817109281298410298301984209124809182409182409182049182049182094182904812049810294810294812' },
      { sender: 'SecurityBot', time: '02:15', text: 'Claim ₹50,000 refund now!!!' },
    ],
  },
  {
    id: 'gen-z',
    name: 'Gen Z chaos',
    description: 'Elongation, slang, emoticons, ZWJ emoji, ALL CAPS, ellipses',
    text: `bro THIS is sooooo good lol... ngl best hackathon everrrr 👨‍💻 🔥\nWait are you srs rn XD ;)\n<3 tbh we definitely won no cap`,
    messages: [
      { sender: 'Ananya', time: '23:45', text: 'bro THIS is sooooo good lol... ngl best hackathon everrrr 👨‍💻 🔥' },
      { sender: 'Kabir', time: '23:46', text: 'Wait are you srs rn XD ;)' },
      { sender: 'You', time: '23:48', text: '<3 tbh we definitely won no cap', isUser: true },
    ],
  },
  {
    id: 'multilingual',
    name: 'Multilingual',
    description: 'English + Devanagari + Tamil + emoji',
    text: `Hello everyone! नमस्ते दोस्त, kal 5pm pe milte hain 🔥\nவணக்கம் நண்பா! All the best for #ProjectDay2026 🇮🇳`,
    messages: [
      { sender: 'Dev', time: '11:00', text: 'Hello everyone! नमस्ते दोस्त, kal 5pm pe milte hain 🔥' },
      { sender: 'Kavitha', time: '11:05', text: 'வணக்கம் நண்பா! All the best for #ProjectDay2026 🇮🇳' },
    ],
  },
  {
    id: 'stress-test',
    name: 'Stress test',
    description: 'Generated 20k-char chaos string for throughput benchmarks',
    text: (() => {
      const base = 'hey @eldo check https://vit.ac.in/x. now!!! meet at 5:30pm ₹1,299.50 #VIT loooool :) `code` *bold* _italic_ ~strike~ ';
      return base.repeat(170); // ~20,000 chars
    })(),
  },
  {
    id: 'error-lab',
    name: 'Error lab',
    description: 'Control chars, unterminated code spans, weird symbols',
    text: `Testing parser recovery: \`unterminated code span\nValid token after newline: @vit #test\nEmbedded null \x00 and bell \x07 characters with symbols & + = < > / \\`,
    messages: [
      { sender: 'Tester', time: '09:00', text: 'Testing parser recovery: `unterminated code span' },
      { sender: 'Tester', time: '09:01', text: 'Valid token after newline: @vit #test' },
      { sender: 'Tester', time: '09:02', text: 'Embedded null \x00 and bell \x07 characters with symbols & + = < > / \\' },
    ],
  },
];
