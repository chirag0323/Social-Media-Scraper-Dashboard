const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

export function seedPosts() {
  return [
    {
      id: "x-001", platform: "X", handle: "@TravelRiya", creator: "Riya Sharma", country: "India",
      language: "English", publishedAt: minutesAgo(14), engagement: 412,
      text: "Finally found a passport renewal appointment in Delhi after trying for three days. Keep checking the Passport Seva slot page in the morning."
    },
    {
      id: "reddit-001", platform: "Reddit", handle: "slot_hunter", creator: "slot_hunter", country: "India",
      language: "English", publishedAt: minutesAgo(44), engagement: 88,
      text: "Passport renewal appointment slots opened in Delhi this morning. After three days of refreshing Passport Seva, I finally booked one."
    },
    {
      id: "youtube-001", platform: "YouTube", handle: "GovUpdatesIN", creator: "Gov Updates India", country: "India",
      language: "Hindi", publishedAt: minutesAgo(72), engagement: 1604,
      text: "तत्काल पासपोर्ट आवेदन के लिए दस्तावेज़ और नई अपॉइंटमेंट प्रक्रिया की जानकारी। आधिकारिक पोर्टल पर ही भुगतान करें।"
    },
    {
      id: "facebook-001", platform: "Facebook", handle: "PunjabTravellers", creator: "Punjab Travellers", country: "India",
      language: "Punjabi", publishedAt: minutesAgo(115), engagement: 235,
      text: "ਪਾਸਪੋਰਟ ਨਵੀਨੀਕਰਨ ਲਈ ਅੰਮ੍ਰਿਤਸਰ ਵਿੱਚ ਅਪਾਇੰਟਮੈਂਟ ਮਿਲ ਗਈ। ਏਜੰਟ ਨੂੰ ਪੈਸੇ ਨਾ ਦਿਓ, ਸਰਕਾਰੀ ਵੈੱਬਸਾਈਟ ਵਰਤੋ।"
    },
    {
      id: "linkedin-001", platform: "LinkedIn", handle: "MEAUpdates", creator: "Consular Services", country: "India",
      language: "English", publishedAt: minutesAgo(161), engagement: 972,
      text: "Public advisory: applicants should apply for passports only via the official portal. Fraudulent agents promising priority appointments are being reported."
    },
    {
      id: "instagram-001", platform: "Instagram", handle: "@nomad.lucia", creator: "Lucia", country: "Spain",
      language: "Spanish", publishedAt: minutesAgo(206), engagement: 540,
      text: "Mi pasaporte caducó antes del viaje. La renovación urgente llegó a tiempo y ya puedo volar mañana."
    },
    {
      id: "tiktok-001", platform: "TikTok", handle: "@airport_help", creator: "Airport Help", country: "United Kingdom",
      language: "English", publishedAt: minutesAgo(247), engagement: 9310,
      text: "Check passport expiry dates before summer travel. Many countries need six months validity or you may be denied boarding."
    },
    {
      id: "reddit-002", platform: "Reddit", handle: "studentvisa27", creator: "studentvisa27", country: "Canada",
      language: "English", publishedAt: minutesAgo(302), engagement: 47,
      text: "My study visa submission is delayed because my renewed passport number has not updated. Has anyone linked a new passport successfully?"
    },
    {
      id: "x-002", platform: "X", handle: "@SecureTravel", creator: "Secure Travel", country: "United States",
      language: "English", publishedAt: minutesAgo(388), engagement: 122,
      text: "Warning: phishing messages claim your passport is suspended and demand payment through a shortened link. Do not click; report the scam."
    },
    {
      id: "youtube-002", platform: "YouTube", handle: "BerlinAbroad", creator: "Berlin Abroad", country: "Germany",
      language: "German", publishedAt: minutesAgo(475), engagement: 688,
      text: "Mein neuer Reisepass ist angekommen. Im Video erkläre ich Antrag, Termin und die Wartezeit bei der Behörde."
    },
    {
      id: "x-spam", platform: "X", handle: "@fastmoney_992", creator: "slots", country: "Unknown",
      language: "English", publishedAt: minutesAgo(82), engagement: 2,
      text: "PASSPORT PASSPORT $$$ click click click http://bit.ly/win-now 999999 !!!!!"
    },
    {
      id: "reddit-003", platform: "Reddit", handle: "newsobserver", creator: "News Observer", country: "Australia",
      language: "English", publishedAt: minutesAgo(690), engagement: 203,
      text: "News: passport processing times are improving ahead of holiday demand, according to today's departmental service update."
    },
    {
      id: "ig-002", platform: "Instagram", handle: "@layla.travels", creator: "Layla", country: "United Arab Emirates",
      language: "Arabic", publishedAt: minutesAgo(780), engagement: 359,
      text: "تم تجديد جواز السفر قبل الرحلة. تأكدوا من صلاحية الجواز واحجزوا الموعد من الموقع الرسمي فقط."
    }
  ];
}
