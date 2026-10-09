const departmentOptions = ['Computer Science', 'Electronics and Communication Engineering', 'Electrical Engineering', 'Physics'];

export const resourceDefinitions = {
  rooms: {
    title: 'Rooms',
    description: 'Manage campus rooms and their availability.',
    singular: 'room',
    columns: [
      { key: 'name', label: 'ROOM' }, { key: 'building', label: 'BUILDING' },
      { key: 'floor', label: 'FLOOR' }, { key: 'type', label: 'TYPE' },
      { key: 'capacity', label: 'CAPACITY' }, { key: 'isActive', label: 'STATUS' },
    ],
    fields: [
      { key: 'name', label: 'Room name', required: true },
      { key: 'building', label: 'Building', required: true },
      { key: 'floor', label: 'Floor', type: 'number', min: -5, max: 200, required: true },
      { key: 'capacity', label: 'Capacity', type: 'number', min: 1, required: true },
      { key: 'type', label: 'Room type', type: 'select', options: ['CLASSROOM', 'LAB', 'SEMINAR_HALL'], required: true },
      { key: 'isActive', label: 'Room is active', type: 'checkbox', defaultValue: true },
    ],
    filters: [{ key: 'type', label: 'All room types', options: ['CLASSROOM', 'LAB', 'SEMINAR_HALL'] }, { key: 'isActive', label: 'Any status', options: ['true|Active', 'false|Inactive'] }],
  },
  faculty: {
    title: 'Faculty',
    description: 'Maintain faculty profiles, departments, and availability.',
    singular: 'faculty member',
    columns: [
      { key: 'name', label: 'NAME' }, { key: 'email', label: 'EMAIL' },
      { key: 'department', label: 'DEPARTMENT' }, { key: 'availability', label: 'AVAILABILITY' },
    ],
    fields: [
      { key: 'name', label: 'Full name', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'department', label: 'Department', type: 'select', options: departmentOptions, required: true },
      { key: 'availability', label: 'Availability', type: 'textarea', placeholder: 'MONDAY 09:00-12:00, one slot per line' },
    ],
    filters: [{ key: 'department', label: 'All departments', options: departmentOptions }],
  },
  subjects: {
    title: 'Subjects',
    description: 'Manage subject catalog entries and credit information.',
    singular: 'subject',
    columns: [
      { key: 'code', label: 'CODE' }, { key: 'name', label: 'SUBJECT' },
      { key: 'department', label: 'DEPARTMENT' }, { key: 'credits', label: 'CREDITS' },
      { key: 'type', label: 'TYPE' },
    ],
    fields: [
      { key: 'code', label: 'Subject code', required: true },
      { key: 'name', label: 'Subject name', required: true },
      { key: 'department', label: 'Department', type: 'select', options: departmentOptions, required: true },
      { key: 'credits', label: 'Credits', type: 'number', min: 1, max: 12, required: true },
      { key: 'type', label: 'Subject type', type: 'select', options: ['THEORY', 'LAB'], required: true },
    ],
    filters: [{ key: 'type', label: 'All subject types', options: ['THEORY', 'LAB'] }, { key: 'department', label: 'All departments', options: departmentOptions }],
  },
  sections: {
    title: 'Sections',
    description: 'Organize student sections by department and semester.',
    singular: 'section',
    columns: [
      { key: 'name', label: 'SECTION / LAB GROUP' }, { key: 'department', label: 'DEPARTMENT' },
      { key: 'sectionType', label: 'GROUP TYPE' }, { key: 'cohort', label: 'COHORT' }, { key: 'semester', label: 'SEMESTER' }, { key: 'studentCount', label: 'STUDENTS' }, { key: 'isActive', label: 'STATUS' },
    ],
    fields: [
      { key: 'name', label: 'Section name', required: true },
      { key: 'department', label: 'Department', type: 'select', options: departmentOptions, required: true },
      { key: 'semester', label: 'Semester', type: 'number', min: 1, max: 16, required: true },
      { key: 'studentCount', label: 'Student count', type: 'number', min: 0, required: true },
      { key: 'sectionType', label: 'Group type', type: 'select', options: ['LECTURE', 'LAB'], defaultValue: 'LECTURE', required: true },
      { key: 'cohort', label: 'Cohort', placeholder: 'e.g. CSE-2026', required: false },
      { key: 'rollNumberStart', label: 'Roll number start', type: 'number', min: 1, required: false },
      { key: 'rollNumberEnd', label: 'Roll number end', type: 'number', min: 1, required: false },
      { key: 'isActive', label: 'Group is active', type: 'checkbox', defaultValue: true },
      { key: 'curriculum', label: 'Weekly course load', type: 'curriculum' },
    ],
    filters: [
      { key: 'department', label: 'All departments', options: departmentOptions },
      { key: 'semester', label: 'All semesters', options: Array.from({ length: 8 }, (_, i) => String(i + 1)) },
      { key: 'isActive', label: 'Active groups', options: ['true|Active', 'false|Archived'] },
    ],
  },
};
