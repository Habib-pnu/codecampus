import type { Exercise, ProgressDataPoint, CodeSnippet, ClassGroup, User, Lab, Institution, BillingTransaction } from '@/types';

export const initialMockInstitutions: Institution[] = [
  { id: 'pnu-inst-001', name: 'Princess of Naradhiwas University', pricePerStudent: 5, adminUserIds: ['inst-admin-001'] },
  { id: 'psu-inst-002', name: 'Prince of Songkla University', pricePerStudent: 8, adminUserIds: [] },
];

export const mockInitialSavedCodes: CodeSnippet[] = [
    { id: "1", title: "My First Program.cpp", userId: "student-pnu-001", code: "#include <iostream>\nusing namespace std;\nint main() {\n  cout << \"Hello, World!\" << endl;\n  return 0;\n}", createdAt: new Date(), updatedAt: new Date() },
    { id: "2", title: "Calculator Stub.cpp", userId: "student-pnu-001", code: "#include <iostream>\nusing namespace std;\nint main() {\n  double a, b;\n  char op;\n  cout << \"Enter number, operator, number (e.g. 3 + 5): \";\n  cin >> a >> op >> b;\n  cout << \"Result: \" << endl;\n  return 0;\n}", createdAt: new Date(), updatedAt: new Date() },
    { id: "3", title: "Python Loop.py", userId: "student-psu-001", code: "for i in range(5):\n  print(i)", createdAt: new Date(), updatedAt: new Date() },
];

export const initialMockUsers: User[] = [
  // --- Global Admin ---
  {
    id: 'admin-001',
    username: 'admin',
    no: '000',
    studentId: 'admin',
    fullName: 'Global Admin',
    email: 'admin@example.com',
    role: 'lecturer', // Admins often have lecturer capabilities
    isAdmin: true,
    mustChangePassword: false,
    completedExercises: [],
    totalScore: 0,
    enrolledClassIds: [],
    pendingClassRequests: [],
    institutionId: 'pnu-inst-001', // Belongs to an institution but has global power
    billingBalance: 0,
  },
  // --- Institution Admin ---
  {
    id: 'inst-admin-001',
    username: 'pnu_admin',
    no: '999',
    studentId: 'pnu_admin',
    fullName: 'PNU Institution Admin',
    email: 'pnu_admin@example.com',
    role: 'institution_admin',
    isAdmin: false,
    mustChangePassword: false,
    completedExercises: [],
    totalScore: 0,
    enrolledClassIds: [],
    pendingClassRequests: [],
    institutionId: 'pnu-inst-001',
    billingBalance: 0,
  },
  // --- Lecturers ---
  {
    id: 'lecturer-pnu-001',
    username: 'teacher.pnu',
    no: '101',
    studentId: 'teacher01',
    fullName: 'Aj. Somchai (PNU)',
    email: 'somchai.pnu@example.com',
    role: 'lecturer',
    isAdmin: false,
    mustChangePassword: false,
    completedExercises: [],
    totalScore: 0,
    enrolledClassIds: [],
    pendingClassRequests: [],
    institutionId: 'pnu-inst-001',
    billingBalance: 10, // Has some unpaid balance
  },
  {
    id: 'lecturer-psu-001',
    username: 'teacher.psu',
    no: '201',
    studentId: 'teacher02',
    fullName: 'Dr. Malinee (PSU)',
    email: 'malinee.psu@example.com',
    role: 'lecturer',
    isAdmin: false,
    mustChangePassword: false,
    completedExercises: [],
    totalScore: 0,
    enrolledClassIds: [],
    pendingClassRequests: [],
    institutionId: 'psu-inst-002',
    billingBalance: 0,
  },
  // --- Students ---
  {
    id: 'student-pnu-001',
    username: 'student.pnu1',
    no: '01',
    studentId: 'S65001',
    fullName: 'Somsak Jaidee',
    email: 'somsak.j@example.com',
    role: 'student',
    isAdmin: false,
    mustChangePassword: false,
    completedExercises: [{ exerciseId: 1, completedAt: new Date().toISOString() }],
    totalScore: 10,
    enrolledClassIds: ['class-pnu-active-01'],
    pendingClassRequests: [],
    institutionId: 'pnu-inst-001',
  },
  {
    id: 'student-pnu-002',
    username: 'student.pnu2',
    no: '02',
    studentId: 'S65002',
    fullName: 'Malee Petch',
    email: 'malee.p@example.com',
    role: 'student',
    isAdmin: false,
    mustChangePassword: false,
    completedExercises: [],
    totalScore: 0,
    enrolledClassIds: ['class-pnu-active-01'],
    pendingClassRequests: [],
    institutionId: 'pnu-inst-001',
  },
  {
    id: 'student-pnu-003',
    username: 'student.pnu3',
    no: '03',
    studentId: 'S65003',
    fullName: 'Piti Rakdee',
    email: 'piti.r@example.com',
    role: 'student',
    isAdmin: false,
    mustChangePassword: false,
    completedExercises: [],
    totalScore: 0,
    enrolledClassIds: [],
    pendingClassRequests: [
       {
        classId: 'class-pnu-pending-01',
        className: 'Fall 2024 Algorithms',
        userId: 'student-pnu-003',
        username: 'student.pnu3',
        no: '03',
        studentId: 'S65003',
        fullName: 'Piti Rakdee',
        userEmail: 'piti.r@example.com',
        requestedAt: new Date().toISOString()
      }
    ],
    institutionId: 'pnu-inst-001',
  },
  {
    id: 'student-psu-001',
    username: 'student.psu1',
    no: '01',
    studentId: '12345678',
    fullName: 'Peter Pan',
    email: 'peter.p@example.com',
    role: 'student',
    isAdmin: false,
    mustChangePassword: false,
    completedExercises: [],
    totalScore: 0,
    enrolledClassIds: [],
    pendingClassRequests: [],
    institutionId: 'psu-inst-002',
  }
];

export const mockClassGroups: ClassGroup[] = [
  // --- PNU Classes ---
  {
    id: 'class-pnu-active-01',
    name: 'Spring 2024 Intro to C++',
    adminId: 'lecturer-pnu-001',
    classCode: 'PNUCPP101',
    assignedExercises: [
      { exerciseId: 1, addedAt: new Date().toISOString() },
      { exerciseId: 2, addedAt: new Date().toISOString() },
    ],
    pendingJoinRequests: [],
    members: [
      { userId: 'student-pnu-001', alias: 'Somsak', joinedAt: new Date().toISOString(), status: 'active' },
      { userId: 'student-pnu-002', alias: 'Malee', joinedAt: new Date().toISOString(), status: 'active' },
    ],
    assignedChallenges: [],
    status: 'active',
    startedAt: new Date().toISOString(),
    institutionId: 'pnu-inst-001',
    capacity: 50,
    assistanceRequests: [
      {
        id: 'assist-req-001',
        studentId: 'student-pnu-001',
        studentName: 'Somsak Jaidee',
        classId: 'class-pnu-active-01',
        problemContext: "I'm stuck on Exercise 2, 'Check for Even Number'.",
        status: 'open',
        createdAt: new Date().toISOString(),
        messages: [{ id: 'assist-msg-001', senderId: 'student-pnu-001', sender: 'student', text: 'My if statement is not working.', timestamp: new Date().toISOString() }]
      }
    ],
    publicChatMessages: [
      { id: 'pub-msg-001', senderId: 'lecturer-pnu-001', senderName: 'Aj. Somchai (PNU)', text: 'Welcome everyone! Please remember the deadline is next Friday.', timestamp: new Date().toISOString() },
      { id: 'pub-msg-002', senderId: 'student-pnu-001', senderName: 'Somsak Jaidee', text: 'Thank you, professor!', timestamp: new Date().toISOString() },
    ]
  },
  {
    id: 'class-pnu-pending-01',
    name: 'Fall 2024 Algorithms',
    adminId: 'lecturer-pnu-001',
    classCode: 'PNUALGO401',
    assignedExercises: [],
    pendingJoinRequests: [
      {
        classId: 'class-pnu-pending-01',
        className: 'Fall 2024 Algorithms',
        userId: 'student-pnu-003',
        username: 'student.pnu3',
        no: '03',
        studentId: 'S65003',
        fullName: 'Piti Rakdee',
        userEmail: 'piti.r@example.com',
        requestedAt: new Date().toISOString()
      }
    ],
    members: [],
    assignedChallenges: [],
    status: 'pending',
    institutionId: 'pnu-inst-001',
    capacity: 30,
    assistanceRequests: [],
    publicChatMessages: []
  },
  {
    id: 'class-pnu-finished-01',
    name: 'Old C++ Class (Finished)',
    adminId: 'lecturer-pnu-001',
    classCode: 'PNUOLD',
    assignedExercises: [],
    pendingJoinRequests: [],
    members: [],
    assignedChallenges: [],
    status: 'finished',
    startedAt: new Date(2023, 8, 1).toISOString(),
    finishedAt: new Date(2023, 12, 15).toISOString(),
    institutionId: 'pnu-inst-001',
    capacity: 100,
    assistanceRequests: [],
    publicChatMessages: [],
  },
  // --- PSU Class ---
  {
    id: 'class-psu-active-01',
    name: 'PSU Python Programming',
    adminId: 'lecturer-psu-001',
    classCode: 'PSUPY101',
    assignedExercises: [
      { exerciseId: 9, addedAt: new Date().toISOString() },
    ],
    pendingJoinRequests: [],
    members: [
      { userId: 'student-psu-001', alias: 'Peter', joinedAt: new Date().toISOString(), status: 'active' }
    ],
    assignedChallenges: [],
    status: 'active',
    startedAt: new Date().toISOString(),
    institutionId: 'psu-inst-002',
    capacity: 100,
    assistanceRequests: [],
    publicChatMessages: [],
  }
];

export const initialMockLabs: Lab[] = [
  {
    id: "lab-template-cpp-001",
    title: { en: "C++ Fundamentals Lab", th: "แล็บพื้นฐาน C++" },
    description: { en: "A course to practice basic C++ syntax.", th: "คอร์สฝึกไวยากรณ์ C++ พื้นฐาน" },
    creatorId: "admin-001",
    isTemplate: true,
    scope: "global",
    challenges: [
      {
        id: "ch-cpp-001-1",
        labId: "lab-template-cpp-001",
        title: "Week 1: I/O and Variables",
        description: "Practice with standard input/output and variables.",
        language: "cpp",
        targetCodes: [
          { id: "tc-cpp-1-1", code: "#include <iostream>\nint main() { int x; std::cin >> x; std::cout << \"Val: \" << x; return 0; }", requiredOutputSimilarity: 100, description: "Read and print an integer", points: 100, testCases: [{ input: "42" }] }
        ]
      },
      {
        id: "ch-cpp-001-2",
        labId: "lab-template-cpp-001",
        title: "Week 2: Conditional Logic",
        description: "Practice with if-else statements.",
        language: "cpp",
        language: "cpp",
        targetCodes: [
          { id: "tc-cpp-2-1", code: "#include <iostream>\nint main() { int x; std::cin >> x; if(x%2==0){std::cout << \"Even\";} else {std::cout << \"Odd\";} return 0; }", requiredOutputSimilarity: 100, description: "Even or Odd", points: 100, testCases: [{ input: "10" }, {input: "7"}] }
        ]
      }
    ]
  },
  {
    id: "lab-template-python-001",
    title: { en: "Python for Beginners Lab", th: "แล็บ Python สำหรับผู้เริ่มต้น" },
    description: { en: "A hands-on lab course for Python.", th: "คอร์สแล็บปฏิบัติสำหรับ Python" },
    creatorId: 'lecturer-psu-001',
    isTemplate: true,
    scope: "institutional",
    challenges: [
      {
        id: "ch-py-001-1",
        labId: "lab-template-python-001",
        title: "Week 1: Python Basics",
        description: "Getting started with Python I/O.",
        language: "python",
        targetCodes: [
          { id: "tc-py-1-1", code: "name = input()\nprint(f'Hello, {name}')", requiredOutputSimilarity: 100, description: "Greeting", points: 100, testCases: [{ input: "Python" }] }
        ]
      }
    ]
  }
];

export const initialMockTransactions: BillingTransaction[] = [
  { id: 'txn-001', lecturerId: 'lecturer-pnu-001', studentId: 'student-pnu-001', classId: 'class-pnu-active-01', amount: 5, timestamp: new Date(Date.now() - 86400000).toISOString(), paid: false },
  { id: 'txn-002', lecturerId: 'lecturer-pnu-001', studentId: 'student-pnu-002', classId: 'class-pnu-active-01', amount: 5, timestamp: new Date(Date.now() - 86400000).toISOString(), paid: false },
];

// No need to export mockExercises and mockProgressData if they are not used elsewhere.
// Assuming they are superseded by the more detailed data above.
export const mockExercises: Exercise[] = [];
export const mockProgressData: ProgressDataPoint[] = [];
