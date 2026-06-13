// FIFA World Cup 2026 — Tournament Data
// Source: FIFA.com Final Draw (Dec 5, 2025) + Sporting News schedule (Apr 2026)

const TEAMS = {
  MEX: { name: 'Mexico', nameTh: 'เม็กซิโก', flag: '🇲🇽' },
  RSA: { name: 'South Africa', nameTh: 'แอฟริกาใต้', flag: '🇿🇦' },
  KOR: { name: 'South Korea', nameTh: 'เกาหลีใต้', flag: '🇰🇷' },
  CZE: { name: 'Czechia', nameTh: 'เช็กเกีย', flag: '🇨🇿' },
  CAN: { name: 'Canada', nameTh: 'แคนาดา', flag: '🇨🇦' },
  BIH: { name: 'Bosnia and Herzegovina', nameTh: 'บอสเนีย', flag: '🇧🇦' },
  QAT: { name: 'Qatar', nameTh: 'กาตาร์', flag: '🇶🇦' },
  SUI: { name: 'Switzerland', nameTh: 'สวิตเซอร์แลนด์', flag: '🇨🇭' },
  BRA: { name: 'Brazil', nameTh: 'บราซิล', flag: '🇧🇷' },
  MAR: { name: 'Morocco', nameTh: 'โมร็อกโก', flag: '🇲🇦' },
  HAI: { name: 'Haiti', nameTh: 'เฮติ', flag: '🇭🇹' },
  SCO: { name: 'Scotland', nameTh: 'สกอตแลนด์', flag: '🏴' },
  USA: { name: 'United States', nameTh: 'สหรัฐอเมริกา', flag: '🇺🇸' },
  PAR: { name: 'Paraguay', nameTh: 'ปารากวัย', flag: '🇵🇾' },
  AUS: { name: 'Australia', nameTh: 'ออสเตรเลีย', flag: '🇦🇺' },
  TUR: { name: 'Turkey', nameTh: 'ตุรกี', flag: '🇹🇷' },
  GER: { name: 'Germany', nameTh: 'เยอรมนี', flag: '🇩🇪' },
  CUW: { name: 'Curacao', nameTh: 'คูราเซา', flag: '🇨🇼' },
  CIV: { name: 'Ivory Coast', nameTh: 'ไอวอรี่โคสต์', flag: '🇨🇮' },
  ECU: { name: 'Ecuador', nameTh: 'เอกวาดอร์', flag: '🇪🇨' },
  NED: { name: 'Netherlands', nameTh: 'เนเธอร์แลนด์', flag: '🇳🇱' },
  JPN: { name: 'Japan', nameTh: 'ญี่ปุ่น', flag: '🇯🇵' },
  SWE: { name: 'Sweden', nameTh: 'สวีเดน', flag: '🇸🇪' },
  TUN: { name: 'Tunisia', nameTh: 'ตูนิเซีย', flag: '🇹🇳' },
  BEL: { name: 'Belgium', nameTh: 'เบลเยียม', flag: '🇧🇪' },
  EGY: { name: 'Egypt', nameTh: 'อียิปต์', flag: '🇪🇬' },
  IRN: { name: 'Iran', nameTh: 'อิหร่าน', flag: '🇮🇷' },
  NZL: { name: 'New Zealand', nameTh: 'นิวซีแลนด์', flag: '🇳🇿' },
  ESP: { name: 'Spain', nameTh: 'สเปน', flag: '🇪🇸' },
  CPV: { name: 'Cape Verde', nameTh: 'เคปเวิร์ด', flag: '🇨🇻' },
  KSA: { name: 'Saudi Arabia', nameTh: 'ซาอุดีอาระเบีย', flag: '🇸🇦' },
  URU: { name: 'Uruguay', nameTh: 'อุรุกวัย', flag: '🇺🇾' },
  FRA: { name: 'France', nameTh: 'ฝรั่งเศส', flag: '🇫🇷' },
  SEN: { name: 'Senegal', nameTh: 'เซเนกัล', flag: '🇸🇳' },
  IRQ: { name: 'Iraq', nameTh: 'อิรัก', flag: '🇮🇶' },
  NOR: { name: 'Norway', nameTh: 'นอร์เวย์', flag: '🇳🇴' },
  ARG: { name: 'Argentina', nameTh: 'อาร์เจนตินา', flag: '🇦🇷' },
  ALG: { name: 'Algeria', nameTh: 'แอลจีเรีย', flag: '🇩🇿' },
  AUT: { name: 'Austria', nameTh: 'ออสเตรีย', flag: '🇦🇹' },
  JOR: { name: 'Jordan', nameTh: 'จอร์แดน', flag: '🇯🇴' },
  POR: { name: 'Portugal', nameTh: 'โปรตุเกส', flag: '🇵🇹' },
  COD: { name: 'DR Congo', nameTh: 'คองโก', flag: '🇨🇩' },
  UZB: { name: 'Uzbekistan', nameTh: 'อุซเบกิสถาน', flag: '🇺🇿' },
  COL: { name: 'Colombia', nameTh: 'โคลอมเบีย', flag: '🇨🇴' },
  ENG: { name: 'England', nameTh: 'อังกฤษ', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  CRO: { name: 'Croatia', nameTh: 'โครเอเชีย', flag: '🇭🇷' },
  GHA: { name: 'Ghana', nameTh: 'กานา', flag: '🇬🇭' },
  PAN: { name: 'Panama', nameTh: 'ปานามา', flag: '🇵🇦' },
};

// Groups — 12 groups of 4 teams
const GROUPS = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

// All 104 matches — times stored as ET (Eastern Time, UTC-4 in summer)
// Venue format: "Stadium (City, Country)"
const MATCHES = [
  // === GROUP STAGE (72 matches) ===
  // Group A
  { id: 'M001', num: 1,  stage: 'group', group: 'A', date: '2026-06-11T15:00', tz: 'ET', team1: 'MEX', team2: 'RSA', venue: 'Estadio Azteca (Mexico City, MEX)' },
  { id: 'M002', num: 2,  stage: 'group', group: 'A', date: '2026-06-11T22:00', tz: 'ET', team1: 'KOR', team2: 'CZE', venue: 'Estadio Akron (Guadalajara, MEX)' },
  { id: 'M003', num: 3,  stage: 'group', group: 'A', date: '2026-06-18T12:00', tz: 'ET', team1: 'CZE', team2: 'RSA', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },
  { id: 'M004', num: 4,  stage: 'group', group: 'A', date: '2026-06-18T21:00', tz: 'ET', team1: 'MEX', team2: 'KOR', venue: 'Estadio Akron (Guadalajara, MEX)' },
  { id: 'M005', num: 5,  stage: 'group', group: 'A', date: '2026-06-24T21:00', tz: 'ET', team1: 'CZE', team2: 'MEX', venue: 'Estadio Azteca (Mexico City, MEX)' },
  { id: 'M006', num: 6,  stage: 'group', group: 'A', date: '2026-06-24T21:00', tz: 'ET', team1: 'RSA', team2: 'KOR', venue: 'Estadio BBVA (Monterrey, MEX)' },

  // Group B
  { id: 'M007', num: 7,  stage: 'group', group: 'B', date: '2026-06-12T15:00', tz: 'ET', team1: 'CAN', team2: 'BIH', venue: 'BMO Field (Toronto, CAN)' },
  { id: 'M008', num: 8,  stage: 'group', group: 'B', date: '2026-06-13T15:00', tz: 'ET', team1: 'QAT', team2: 'SUI', venue: "Levi's Stadium (San Francisco, USA)" },
  { id: 'M009', num: 9,  stage: 'group', group: 'B', date: '2026-06-18T15:00', tz: 'ET', team1: 'BIH', team2: 'SUI', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M010', num: 10, stage: 'group', group: 'B', date: '2026-06-18T18:00', tz: 'ET', team1: 'CAN', team2: 'QAT', venue: 'BC Place (Vancouver, CAN)' },
  { id: 'M011', num: 11, stage: 'group', group: 'B', date: '2026-06-24T15:00', tz: 'ET', team1: 'SUI', team2: 'CAN', venue: 'BC Place (Vancouver, CAN)' },
  { id: 'M012', num: 12, stage: 'group', group: 'B', date: '2026-06-24T15:00', tz: 'ET', team1: 'BIH', team2: 'QAT', venue: 'Lumen Field (Seattle, USA)' },

  // Group C
  { id: 'M013', num: 13, stage: 'group', group: 'C', date: '2026-06-13T18:00', tz: 'ET', team1: 'BRA', team2: 'MAR', venue: 'MetLife Stadium (East Rutherford, USA)' },
  { id: 'M014', num: 14, stage: 'group', group: 'C', date: '2026-06-13T21:00', tz: 'ET', team1: 'HAI', team2: 'SCO', venue: 'Gillette Stadium (Boston, USA)' },
  { id: 'M015', num: 15, stage: 'group', group: 'C', date: '2026-06-19T18:00', tz: 'ET', team1: 'SCO', team2: 'MAR', venue: 'Lincoln Financial Field (Philadelphia, USA)' },
  { id: 'M016', num: 16, stage: 'group', group: 'C', date: '2026-06-19T21:00', tz: 'ET', team1: 'BRA', team2: 'HAI', venue: 'Gillette Stadium (Boston, USA)' },
  { id: 'M017', num: 17, stage: 'group', group: 'C', date: '2026-06-24T18:00', tz: 'ET', team1: 'SCO', team2: 'BRA', venue: 'Hard Rock Stadium (Miami, USA)' },
  { id: 'M018', num: 18, stage: 'group', group: 'C', date: '2026-06-24T18:00', tz: 'ET', team1: 'MAR', team2: 'HAI', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },

  // Group D
  { id: 'M019', num: 19, stage: 'group', group: 'D', date: '2026-06-12T21:00', tz: 'ET', team1: 'USA', team2: 'PAR', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M020', num: 20, stage: 'group', group: 'D', date: '2026-06-14T00:00', tz: 'ET', team1: 'AUS', team2: 'TUR', venue: 'BC Place (Vancouver, CAN)' },
  { id: 'M021', num: 21, stage: 'group', group: 'D', date: '2026-06-20T00:00', tz: 'ET', team1: 'TUR', team2: 'PAR', venue: "Levi's Stadium (Santa Clara, USA)" },
  { id: 'M022', num: 22, stage: 'group', group: 'D', date: '2026-06-19T15:00', tz: 'ET', team1: 'USA', team2: 'AUS', venue: 'Lumen Field (Seattle, USA)' },
  { id: 'M023', num: 23, stage: 'group', group: 'D', date: '2026-06-25T22:00', tz: 'ET', team1: 'TUR', team2: 'USA', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M024', num: 24, stage: 'group', group: 'D', date: '2026-06-25T22:00', tz: 'ET', team1: 'PAR', team2: 'AUS', venue: "Levi's Stadium (Santa Clara, USA)" },

  // Group E
  { id: 'M025', num: 25, stage: 'group', group: 'E', date: '2026-06-14T13:00', tz: 'ET', team1: 'GER', team2: 'CUW', venue: 'NRG Stadium (Houston, USA)' },
  { id: 'M026', num: 26, stage: 'group', group: 'E', date: '2026-06-14T19:00', tz: 'ET', team1: 'CIV', team2: 'ECU', venue: 'Lincoln Financial Field (Philadelphia, USA)' },
  { id: 'M027', num: 27, stage: 'group', group: 'E', date: '2026-06-20T16:00', tz: 'ET', team1: 'GER', team2: 'CIV', venue: 'BMO Field (Toronto, CAN)' },
  { id: 'M028', num: 28, stage: 'group', group: 'E', date: '2026-06-20T20:00', tz: 'ET', team1: 'ECU', team2: 'CUW', venue: 'Arrowhead Stadium (Kansas City, USA)' },
  { id: 'M029', num: 29, stage: 'group', group: 'E', date: '2026-06-25T16:00', tz: 'ET', team1: 'ECU', team2: 'GER', venue: 'MetLife Stadium (East Rutherford, USA)' },
  { id: 'M030', num: 30, stage: 'group', group: 'E', date: '2026-06-25T16:00', tz: 'ET', team1: 'CUW', team2: 'CIV', venue: 'Lincoln Financial Field (Philadelphia, USA)' },

  // Group F
  { id: 'M031', num: 31, stage: 'group', group: 'F', date: '2026-06-14T16:00', tz: 'ET', team1: 'NED', team2: 'JPN', venue: "AT&T Stadium (Arlington, USA)" },
  { id: 'M032', num: 32, stage: 'group', group: 'F', date: '2026-06-14T22:00', tz: 'ET', team1: 'SWE', team2: 'TUN', venue: 'Estadio BBVA (Monterrey, MEX)' },
  { id: 'M033', num: 33, stage: 'group', group: 'F', date: '2026-06-21T00:00', tz: 'ET', team1: 'TUN', team2: 'JPN', venue: 'Estadio BBVA (Monterrey, MEX)' },
  { id: 'M034', num: 34, stage: 'group', group: 'F', date: '2026-06-20T13:00', tz: 'ET', team1: 'NED', team2: 'SWE', venue: 'NRG Stadium (Houston, USA)' },
  { id: 'M035', num: 35, stage: 'group', group: 'F', date: '2026-06-25T19:00', tz: 'ET', team1: 'TUN', team2: 'NED', venue: "AT&T Stadium (Arlington, USA)" },
  { id: 'M036', num: 36, stage: 'group', group: 'F', date: '2026-06-25T19:00', tz: 'ET', team1: 'JPN', team2: 'SWE', venue: 'Arrowhead Stadium (Kansas City, USA)' },

  // Group G
  { id: 'M037', num: 37, stage: 'group', group: 'G', date: '2026-06-15T15:00', tz: 'ET', team1: 'BEL', team2: 'EGY', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M038', num: 38, stage: 'group', group: 'G', date: '2026-06-15T21:00', tz: 'ET', team1: 'IRN', team2: 'NZL', venue: 'Lumen Field (Seattle, USA)' },
  { id: 'M039', num: 39, stage: 'group', group: 'G', date: '2026-06-21T15:00', tz: 'ET', team1: 'BEL', team2: 'IRN', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M040', num: 40, stage: 'group', group: 'G', date: '2026-06-21T21:00', tz: 'ET', team1: 'NZL', team2: 'EGY', venue: 'BC Place (Vancouver, CAN)' },
  { id: 'M041', num: 41, stage: 'group', group: 'G', date: '2026-06-26T23:00', tz: 'ET', team1: 'NZL', team2: 'BEL', venue: 'Lumen Field (Seattle, USA)' },
  { id: 'M042', num: 42, stage: 'group', group: 'G', date: '2026-06-26T23:00', tz: 'ET', team1: 'EGY', team2: 'IRN', venue: 'BC Place (Vancouver, CAN)' },

  // Group H
  { id: 'M043', num: 43, stage: 'group', group: 'H', date: '2026-06-15T12:00', tz: 'ET', team1: 'ESP', team2: 'CPV', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },
  { id: 'M044', num: 44, stage: 'group', group: 'H', date: '2026-06-15T18:00', tz: 'ET', team1: 'KSA', team2: 'URU', venue: 'Hard Rock Stadium (Miami, USA)' },
  { id: 'M045', num: 45, stage: 'group', group: 'H', date: '2026-06-21T12:00', tz: 'ET', team1: 'ESP', team2: 'KSA', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },
  { id: 'M046', num: 46, stage: 'group', group: 'H', date: '2026-06-21T18:00', tz: 'ET', team1: 'URU', team2: 'CPV', venue: 'Hard Rock Stadium (Miami, USA)' },
  { id: 'M047', num: 47, stage: 'group', group: 'H', date: '2026-06-26T20:00', tz: 'ET', team1: 'URU', team2: 'ESP', venue: 'NRG Stadium (Houston, USA)' },
  { id: 'M048', num: 48, stage: 'group', group: 'H', date: '2026-06-26T20:00', tz: 'ET', team1: 'CPV', team2: 'KSA', venue: 'Estadio Akron (Guadalajara, MEX)' },

  // Group I
  { id: 'M049', num: 49, stage: 'group', group: 'I', date: '2026-06-16T15:00', tz: 'ET', team1: 'FRA', team2: 'SEN', venue: 'MetLife Stadium (East Rutherford, USA)' },
  { id: 'M050', num: 50, stage: 'group', group: 'I', date: '2026-06-16T18:00', tz: 'ET', team1: 'IRQ', team2: 'NOR', venue: 'Gillette Stadium (Boston, USA)' },
  { id: 'M051', num: 51, stage: 'group', group: 'I', date: '2026-06-22T17:00', tz: 'ET', team1: 'FRA', team2: 'IRQ', venue: 'Lincoln Financial Field (Philadelphia, USA)' },
  { id: 'M052', num: 52, stage: 'group', group: 'I', date: '2026-06-22T20:00', tz: 'ET', team1: 'NOR', team2: 'SEN', venue: 'MetLife Stadium (East Rutherford, USA)' },
  { id: 'M053', num: 53, stage: 'group', group: 'I', date: '2026-06-26T15:00', tz: 'ET', team1: 'NOR', team2: 'FRA', venue: 'Gillette Stadium (Boston, USA)' },
  { id: 'M054', num: 54, stage: 'group', group: 'I', date: '2026-06-26T15:00', tz: 'ET', team1: 'SEN', team2: 'IRQ', venue: 'BMO Field (Toronto, CAN)' },

  // Group J
  { id: 'M055', num: 55, stage: 'group', group: 'J', date: '2026-06-16T21:00', tz: 'ET', team1: 'ARG', team2: 'ALG', venue: 'Arrowhead Stadium (Kansas City, USA)' },
  { id: 'M056', num: 56, stage: 'group', group: 'J', date: '2026-06-17T00:00', tz: 'ET', team1: 'AUT', team2: 'JOR', venue: "Levi's Stadium (Santa Clara, USA)" },
  { id: 'M057', num: 57, stage: 'group', group: 'J', date: '2026-06-22T13:00', tz: 'ET', team1: 'ARG', team2: 'AUT', venue: "AT&T Stadium (Arlington, USA)" },
  { id: 'M058', num: 58, stage: 'group', group: 'J', date: '2026-06-22T23:00', tz: 'ET', team1: 'JOR', team2: 'ALG', venue: "Levi's Stadium (Santa Clara, USA)" },
  { id: 'M059', num: 59, stage: 'group', group: 'J', date: '2026-06-27T22:00', tz: 'ET', team1: 'JOR', team2: 'ARG', venue: 'Arrowhead Stadium (Kansas City, USA)' },
  { id: 'M060', num: 60, stage: 'group', group: 'J', date: '2026-06-27T22:00', tz: 'ET', team1: 'ALG', team2: 'AUT', venue: "AT&T Stadium (Arlington, USA)" },

  // Group K
  { id: 'M061', num: 61, stage: 'group', group: 'K', date: '2026-06-17T13:00', tz: 'ET', team1: 'POR', team2: 'COD', venue: 'NRG Stadium (Houston, USA)' },
  { id: 'M062', num: 62, stage: 'group', group: 'K', date: '2026-06-17T22:00', tz: 'ET', team1: 'UZB', team2: 'COL', venue: 'Estadio Azteca (Mexico City, MEX)' },
  { id: 'M063', num: 63, stage: 'group', group: 'K', date: '2026-06-23T13:00', tz: 'ET', team1: 'POR', team2: 'UZB', venue: 'NRG Stadium (Houston, USA)' },
  { id: 'M064', num: 64, stage: 'group', group: 'K', date: '2026-06-23T22:00', tz: 'ET', team1: 'COL', team2: 'COD', venue: 'Estadio Akron (Guadalajara, MEX)' },
  { id: 'M065', num: 65, stage: 'group', group: 'K', date: '2026-06-27T19:30', tz: 'ET', team1: 'COL', team2: 'POR', venue: 'Hard Rock Stadium (Miami, USA)' },
  { id: 'M066', num: 66, stage: 'group', group: 'K', date: '2026-06-27T19:30', tz: 'ET', team1: 'COD', team2: 'UZB', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },

  // Group L
  { id: 'M067', num: 67, stage: 'group', group: 'L', date: '2026-06-17T16:00', tz: 'ET', team1: 'ENG', team2: 'CRO', venue: "AT&T Stadium (Arlington, USA)" },
  { id: 'M068', num: 68, stage: 'group', group: 'L', date: '2026-06-17T19:00', tz: 'ET', team1: 'GHA', team2: 'PAN', venue: 'BMO Field (Toronto, CAN)' },
  { id: 'M069', num: 69, stage: 'group', group: 'L', date: '2026-06-23T16:00', tz: 'ET', team1: 'ENG', team2: 'GHA', venue: 'Gillette Stadium (Boston, USA)' },
  { id: 'M070', num: 70, stage: 'group', group: 'L', date: '2026-06-23T19:00', tz: 'ET', team1: 'PAN', team2: 'CRO', venue: 'BMO Field (Toronto, CAN)' },
  { id: 'M071', num: 71, stage: 'group', group: 'L', date: '2026-06-27T17:00', tz: 'ET', team1: 'PAN', team2: 'ENG', venue: 'MetLife Stadium (East Rutherford, USA)' },
  { id: 'M072', num: 72, stage: 'group', group: 'L', date: '2026-06-27T17:00', tz: 'ET', team1: 'CRO', team2: 'GHA', venue: 'Lincoln Financial Field (Philadelphia, USA)' },

  // === KNOCKOUT STAGE (32 matches) ===
  // Round of 32
  { id: 'M073', num: 73, stage: 'R32', date: '2026-06-28T15:00', tz: 'ET', team1: '2A', team2: '2B', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M074', num: 74, stage: 'R32', date: '2026-06-29T16:30', tz: 'ET', team1: '1E', team2: '3rd', venue: 'Gillette Stadium (Boston, USA)' },
  { id: 'M075', num: 75, stage: 'R32', date: '2026-06-29T21:00', tz: 'ET', team1: '1F', team2: '2C', venue: 'Estadio BBVA (Monterrey, MEX)' },
  { id: 'M076', num: 76, stage: 'R32', date: '2026-06-29T13:00', tz: 'ET', team1: '1C', team2: '2F', venue: 'NRG Stadium (Houston, USA)' },
  { id: 'M077', num: 77, stage: 'R32', date: '2026-06-30T17:00', tz: 'ET', team1: '1I', team2: '3rd', venue: 'MetLife Stadium (East Rutherford, USA)' },
  { id: 'M078', num: 78, stage: 'R32', date: '2026-06-30T13:00', tz: 'ET', team1: '2E', team2: '2I', venue: "AT&T Stadium (Arlington, USA)" },
  { id: 'M079', num: 79, stage: 'R32', date: '2026-06-30T21:00', tz: 'ET', team1: '1A', team2: '3rd', venue: 'Estadio Azteca (Mexico City, MEX)' },
  { id: 'M080', num: 80, stage: 'R32', date: '2026-07-01T12:00', tz: 'ET', team1: '1L', team2: '3rd', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },
  { id: 'M081', num: 81, stage: 'R32', date: '2026-07-01T20:00', tz: 'ET', team1: '1D', team2: '3rd', venue: "Levi's Stadium (Santa Clara, USA)" },
  { id: 'M082', num: 82, stage: 'R32', date: '2026-07-01T16:00', tz: 'ET', team1: '1G', team2: '3rd', venue: 'Lumen Field (Seattle, USA)' },
  { id: 'M083', num: 83, stage: 'R32', date: '2026-07-02T19:00', tz: 'ET', team1: '2K', team2: '2L', venue: 'BMO Field (Toronto, CAN)' },
  { id: 'M084', num: 84, stage: 'R32', date: '2026-07-02T15:00', tz: 'ET', team1: '1H', team2: '2J', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M085', num: 85, stage: 'R32', date: '2026-07-02T23:00', tz: 'ET', team1: '1B', team2: '3rd', venue: 'BC Place (Vancouver, CAN)' },
  { id: 'M086', num: 86, stage: 'R32', date: '2026-07-03T18:00', tz: 'ET', team1: '1J', team2: '2H', venue: 'Hard Rock Stadium (Miami, USA)' },
  { id: 'M087', num: 87, stage: 'R32', date: '2026-07-03T21:30', tz: 'ET', team1: '1K', team2: '3rd', venue: 'Arrowhead Stadium (Kansas City, USA)' },
  { id: 'M088', num: 88, stage: 'R32', date: '2026-07-03T14:00', tz: 'ET', team1: '2D', team2: '2G', venue: "AT&T Stadium (Arlington, USA)" },

  // Round of 16
  { id: 'M089', num: 89, stage: 'R16', date: '2026-07-04T13:00', tz: 'ET', team1: 'W73', team2: 'W75', venue: 'NRG Stadium (Houston, USA)' },
  { id: 'M090', num: 90, stage: 'R16', date: '2026-07-04T17:00', tz: 'ET', team1: 'W74', team2: 'W77', venue: 'Lincoln Financial Field (Philadelphia, USA)' },
  { id: 'M091', num: 91, stage: 'R16', date: '2026-07-05T16:00', tz: 'ET', team1: 'W76', team2: 'W78', venue: 'MetLife Stadium (East Rutherford, USA)' },
  { id: 'M092', num: 92, stage: 'R16', date: '2026-07-05T20:00', tz: 'ET', team1: 'W79', team2: 'W80', venue: 'Estadio Azteca (Mexico City, MEX)' },
  { id: 'M093', num: 93, stage: 'R16', date: '2026-07-06T15:00', tz: 'ET', team1: 'W83', team2: 'W84', venue: "AT&T Stadium (Arlington, USA)" },
  { id: 'M094', num: 94, stage: 'R16', date: '2026-07-06T20:00', tz: 'ET', team1: 'W81', team2: 'W82', venue: 'Lumen Field (Seattle, USA)' },
  { id: 'M095', num: 95, stage: 'R16', date: '2026-07-07T12:00', tz: 'ET', team1: 'W86', team2: 'W88', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },
  { id: 'M096', num: 96, stage: 'R16', date: '2026-07-07T16:00', tz: 'ET', team1: 'W85', team2: 'W87', venue: 'BC Place (Vancouver, CAN)' },

  // Quarter-finals
  { id: 'M097', num: 97, stage: 'QF', date: '2026-07-09T16:00', tz: 'ET', team1: 'W90', team2: 'W89', venue: 'Gillette Stadium (Boston, USA)' },
  { id: 'M098', num: 98, stage: 'QF', date: '2026-07-10T15:00', tz: 'ET', team1: 'W93', team2: 'W94', venue: 'SoFi Stadium (Inglewood, USA)' },
  { id: 'M099', num: 99, stage: 'QF', date: '2026-07-11T17:00', tz: 'ET', team1: 'W91', team2: 'W92', venue: 'Hard Rock Stadium (Miami, USA)' },
  { id: 'M100', num: 100, stage: 'QF', date: '2026-07-11T21:00', tz: 'ET', team1: 'W95', team2: 'W96', venue: 'Arrowhead Stadium (Kansas City, USA)' },

  // Semi-finals
  { id: 'M101', num: 101, stage: 'SF', date: '2026-07-14T15:00', tz: 'ET', team1: 'W97', team2: 'W98', venue: "AT&T Stadium (Arlington, USA)" },
  { id: 'M102', num: 102, stage: 'SF', date: '2026-07-15T15:00', tz: 'ET', team1: 'W99', team2: 'W100', venue: 'Mercedes-Benz Stadium (Atlanta, USA)' },

  // Third-place match
  { id: 'M103', num: 103, stage: '3rd', date: '2026-07-18T17:00', tz: 'ET', team1: 'L101', team2: 'L102', venue: 'Hard Rock Stadium (Miami, USA)' },

  // Final
  { id: 'M104', num: 104, stage: 'final', date: '2026-07-19T15:00', tz: 'ET', team1: 'W101', team2: 'W102', venue: 'MetLife Stadium (East Rutherford, USA)' },
];

// Convert ET time to UTC (ET = UTC-4 during summer/EDT)
function etToUtc(etDateStr) {
  const d = new Date(etDateStr.replace('T', ' '));
  d.setHours(d.getHours() + 4);
  return d.toISOString();
}

// Convert ET time to Thai time (UTC+7)
function etToThai(etDateStr) {
  const d = new Date(etDateStr.replace('T', ' '));
  d.setHours(d.getHours() + 11);
  return d;
}

// Get display-friendly date
function formatMatchDate(match, lang) {
  const d = etToThai(match.date);
  const day = d.getDate();
  const monthNames = lang === 'th'
    ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${h}:${m} น.`;
}

// Stage labels
const STAGE_LABELS = {
  th: { group: 'รอบแบ่งกลุ่ม', epl: 'พรีเมียร์ลีก', R32: 'รอบ 32 ทีม', R16: 'รอบ 16 ทีม', QF: 'รอบ 8 ทีม', SF: 'รอบ 4 ทีม', '3rd': 'ชิงที่ 3', final: 'นัดชิงชนะเลิศ' },
  en: { group: 'Group Stage', epl: 'Premier League', R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', '3rd': 'Third Place', final: 'Final' },
};

// Resolve team slot labels (e.g., "1A" → "แชมป์กลุ่ม A", "W73" → "ผู้ชนะ นัด 73")
function getTeamLabel(slot, lang) {
  if (TEAMS[slot]) return TEAMS[slot].flag + ' ' + (lang === 'th' ? TEAMS[slot].nameTh : TEAMS[slot].name);
  const th = lang === 'th';
  if (slot.startsWith('W')) return `W${slot.slice(1)}`;
  if (slot.startsWith('L')) return `L${slot.slice(1)}`;
  if (slot === '3rd') return th ? 'ที่ 3 ที่ดีที่สุด' : 'Best 3rd';
  const num = slot.slice(1);
  const pos = slot[0] === '1' ? (th ? 'แชมป์' : '1st') : (th ? 'รองแชมป์' : '2nd');
  return `${pos} ${num}`;
}
