// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Mock Form Data
// ═══════════════════════════════════════════

export const MOCK_FORMS = {
  'job-application': {
    title: 'Senior Product Designer — Application',
    description: 'Complete this application to be considered for the Senior Product Designer position at CreativeSync.',
    url: 'demo://job-application',
    questions: [
      { id: '1', text: 'Full Name', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Email Address', type: 'short_text', required: true, options: [] },
      { id: '3', text: 'Phone Number', type: 'short_text', required: false, options: [] },
      { id: '4', text: 'LinkedIn Profile URL', type: 'short_text', required: false, options: [] },
      { id: '5', text: 'Years of design experience', type: 'dropdown', required: true, options: ['1-2 years', '3-5 years', '5-8 years', '8-10 years', '10+ years'] },
      { id: '6', text: 'What design tools are you proficient in?', type: 'checkbox', required: true, options: ['Figma', 'Sketch', 'Adobe XD', 'Framer', 'Principle', 'After Effects'] },
      { id: '7', text: 'Describe your most impactful design project', type: 'long_text', required: true, options: [] },
      { id: '8', text: 'Why are you interested in this role?', type: 'long_text', required: true, options: [] },
      { id: '9', text: 'What is your expected salary range?', type: 'radio', required: true, options: ['$80k-100k', '$100k-130k', '$130k-160k', '$160k+'] },
      { id: '10', text: 'When can you start?', type: 'date', required: true, options: [] },
      { id: '11', text: 'Are you willing to relocate?', type: 'radio', required: false, options: ['Yes', 'No', 'Open to discussion'] },
      { id: '12', text: 'On a scale of 1-10, how confident are you in leading a design team?', type: 'scale', required: false, options: [] },
    ]
  },

  'customer-feedback': {
    title: 'Customer Feedback Survey',
    description: 'Help us understand how we can improve our service for you.',
    url: 'demo://customer-feedback',
    questions: [
      { id: '1', text: 'What is your primary goal using our product?', type: 'radio', required: true, options: ['Improve workflow efficiency', 'Collaborate with team members', 'Track project progress', 'Automate repetitive tasks'] },
      { id: '2', text: 'On a scale of 1-10, how likely are you to recommend us?', type: 'scale', required: true, options: [] },
      { id: '3', text: 'What features would you like to see improved?', type: 'checkbox', required: false, options: ['Dashboard', 'Reporting', 'Integrations', 'Mobile App', 'API', 'Customer Support'] },
      { id: '4', text: 'Please share any additional feedback', type: 'long_text', required: false, options: [] },
      { id: '5', text: 'Your email (for follow-up)', type: 'short_text', required: false, options: [] },
    ]
  },

  'travel-visa': {
    title: 'Travel Visa Application Form',
    description: 'Complete this application for your travel visa. All fields marked with * are required.',
    url: 'demo://travel-visa',
    questions: [
      { id: '1', text: 'Passport Number', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Full Legal Name (as it appears on passport)', type: 'short_text', required: true, options: [] },
      { id: '3', text: 'Date of Birth', type: 'date', required: true, options: [] },
      { id: '4', text: 'Nationality', type: 'short_text', required: true, options: [] },
      { id: '5', text: 'Purpose of Travel', type: 'radio', required: true, options: ['Tourism', 'Business', 'Education', 'Medical', 'Transit', 'Other'] },
      { id: '6', text: 'Duration of Stay', type: 'dropdown', required: true, options: ['Less than 1 week', '1-2 weeks', '2-4 weeks', '1-3 months', '3-6 months', '6+ months'] },
      { id: '7', text: 'Accommodation Address', type: 'long_text', required: true, options: [] },
      { id: '8', text: 'Have you previously been denied a visa?', type: 'radio', required: true, options: ['Yes', 'No'] },
      { id: '9', text: 'If yes, please provide details', type: 'long_text', required: false, options: [] },
      { id: '10', text: 'Travel Insurance Policy Number', type: 'short_text', required: false, options: [] },
    ]
  },

  'patient-intake': {
    title: 'New Patient Intake Form',
    description: 'Provide basic information so we can prepare for your first appointment.',
    url: 'demo://patient-intake',
    questions: [
      { id: '1', text: 'Full Name', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Date of Birth', type: 'date', required: true, options: [] },
      { id: '3', text: 'Email', type: 'short_text', required: true, options: [] },
      { id: '4', text: 'Phone Number', type: 'short_text', required: true, options: [] },
      { id: '5', text: 'Primary Care Physician', type: 'short_text', required: false, options: [] },
      { id: '6', text: 'Do you have any allergies?', type: 'radio', required: true, options: ['No', 'Yes'] },
      { id: '7', text: 'Allergies (if yes)', type: 'long_text', required: false, options: [] },
      { id: '8', text: 'Current medications', type: 'long_text', required: false, options: [] },
      { id: '9', text: 'Insurance Provider', type: 'dropdown', required: true, options: ['Aetna', 'Blue Cross', 'Cigna', 'UnitedHealthcare', 'Self-pay'] },
      { id: '10', text: 'Emergency Contact Name', type: 'short_text', required: true, options: [] },
      { id: '11', text: 'Emergency Contact Phone', type: 'short_text', required: true, options: [] },
      { id: '12', text: 'Consent to treatment', type: 'radio', required: true, options: ['I agree', 'I do not agree'] },
    ]
  },

  'scholarship': {
    title: 'STEM Excellence Scholarship — Application',
    description: 'Tell us about your academic background and goals.',
    url: 'demo://scholarship',
    questions: [
      { id: '1', text: 'Full Name', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Email', type: 'short_text', required: true, options: [] },
      { id: '3', text: 'University / College', type: 'short_text', required: true, options: [] },
      { id: '4', text: 'Major', type: 'dropdown', required: true, options: ['Computer Science', 'Engineering', 'Mathematics', 'Physics', 'Biology', 'Other'] },
      { id: '5', text: 'Current GPA', type: 'short_text', required: true, options: [] },
      { id: '6', text: 'Graduation Year', type: 'dropdown', required: true, options: ['2026', '2027', '2028', '2029', '2030'] },
      { id: '7', text: 'Why do you deserve this scholarship?', type: 'long_text', required: true, options: [] },
      { id: '8', text: 'Describe a project you are proud of', type: 'long_text', required: true, options: [] },
      { id: '9', text: 'Upload transcript', type: 'file_upload', required: false, options: [] },
    ]
  },

  'insurance-quote': {
    title: 'Auto Insurance Quote',
    description: 'Answer a few questions to estimate your premium.',
    url: 'demo://insurance-quote',
    questions: [
      { id: '1', text: 'Full Name', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Email', type: 'short_text', required: true, options: [] },
      { id: '3', text: 'Vehicle Year', type: 'dropdown', required: true, options: ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'] },
      { id: '4', text: 'Vehicle Make', type: 'short_text', required: true, options: [] },
      { id: '5', text: 'Vehicle Model', type: 'short_text', required: true, options: [] },
      { id: '6', text: 'Do you currently have insurance?', type: 'radio', required: true, options: ['Yes', 'No'] },
      { id: '7', text: 'Accidents in the last 3 years', type: 'dropdown', required: true, options: ['0', '1', '2', '3+'] },
      { id: '8', text: 'Estimated annual mileage', type: 'dropdown', required: true, options: ['< 5,000', '5,000–10,000', '10,000–15,000', '15,000+'] },
    ]
  },

  'b2b-demo': {
    title: 'Enterprise Demo Request',
    description: 'Request a product demo for your team.',
    url: 'demo://b2b-demo',
    questions: [
      { id: '1', text: 'Full Name', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Work Email', type: 'short_text', required: true, options: [] },
      { id: '3', text: 'Company', type: 'short_text', required: true, options: [] },
      { id: '4', text: 'Company size', type: 'dropdown', required: true, options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
      { id: '5', text: 'What are you trying to solve?', type: 'long_text', required: true, options: [] },
      { id: '6', text: 'Preferred demo time', type: 'dropdown', required: false, options: ['Morning', 'Afternoon', 'Evening'] },
    ]
  },

  'rental-app': {
    title: 'Apartment Lease Application',
    description: 'Complete the application to be considered for the unit.',
    url: 'demo://rental-app',
    questions: [
      { id: '1', text: 'Full Name', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Email', type: 'short_text', required: true, options: [] },
      { id: '3', text: 'Phone', type: 'short_text', required: true, options: [] },
      { id: '4', text: 'Current Address', type: 'long_text', required: true, options: [] },
      { id: '5', text: 'Monthly Income', type: 'short_text', required: true, options: [] },
      { id: '6', text: 'Employment Status', type: 'dropdown', required: true, options: ['Employed', 'Self-employed', 'Student', 'Unemployed'] },
      { id: '7', text: 'Do you have pets?', type: 'radio', required: true, options: ['No', 'Yes'] },
      { id: '8', text: 'References (names + contacts)', type: 'long_text', required: false, options: [] },
    ]
  },

  'grant-application': {
    title: 'Community Impact Grant',
    description: 'Submit your organization’s proposal for funding.',
    url: 'demo://grant-application',
    questions: [
      { id: '1', text: 'Organization Name', type: 'short_text', required: true, options: [] },
      { id: '2', text: 'Organization Website', type: 'short_text', required: false, options: [] },
      { id: '3', text: 'Primary Contact Email', type: 'short_text', required: true, options: [] },
      { id: '4', text: 'Mission Statement', type: 'long_text', required: true, options: [] },
      { id: '5', text: 'Requested Amount (USD)', type: 'short_text', required: true, options: [] },
      { id: '6', text: 'How will this grant be used?', type: 'long_text', required: true, options: [] },
      { id: '7', text: 'Target community', type: 'dropdown', required: true, options: ['Youth', 'Healthcare', 'Education', 'Housing', 'Environment', 'Other'] },
      { id: '8', text: 'Success metrics', type: 'long_text', required: false, options: [] },
    ]
  }
};

export const MOCK_AI_ANSWERS = {
  'job-application': {
    '1': { text: 'Alexander James Johnson', source: 'ai', confidence: 0.95 },
    '2': { text: 'alex.johnson@email.com', source: 'ai', confidence: 0.92 },
    '3': { text: '+1 (555) 000-1234', source: 'ai', confidence: 0.88 },
    '4': { text: 'https://linkedin.com/in/alexjohnson-design', source: 'ai', confidence: 0.85 },
    '5': { text: '5-8 years', source: 'ai', confidence: 0.90 },
    '6': { text: 'Figma, Sketch, Framer', source: 'ai', confidence: 0.87 },
    '7': { text: 'Led the redesign of an enterprise dashboard serving 50K+ daily users. Reduced task completion time by 40% through iterative research, a refreshed design system, and tight engineering collaboration.', source: 'ai', confidence: 0.91 },
    '8': { text: 'I’m excited about CreativeSync’s mission and the chance to design AI-assisted workflows at scale. My background building accessible enterprise tools fits the role well.', source: 'ai', confidence: 0.89 },
    '9': { text: '$130k-160k', source: 'ai', confidence: 0.75 },
    '10': { text: '2026-04-15', source: 'ai', confidence: 0.80 },
    '11': { text: 'Open to discussion', source: 'ai', confidence: 0.82 },
    '12': { text: '8', source: 'ai', confidence: 0.85 },
  },
  'customer-feedback': {
    '1': { text: 'Improve workflow efficiency', source: 'ai', confidence: 0.88 },
    '2': { text: '8', source: 'ai', confidence: 0.82 },
    '3': { text: 'Dashboard, Integrations, API', source: 'ai', confidence: 0.78 },
    '4': { text: 'The product has streamlined our workflow. I’d love deeper integrations (Notion/Linear) and more dashboard customization. The API docs could be clearer with more examples.', source: 'ai', confidence: 0.85 },
    '5': { text: 'alex.j@formmate.ai', source: 'ai', confidence: 0.90 },
  },
  'travel-visa': {
    '1': { text: 'N23456789', source: 'ai', confidence: 0.70 },
    '2': { text: 'Alexander James Johnson', source: 'ai', confidence: 0.95 },
    '3': { text: '1992-06-15', source: 'ai', confidence: 0.80 },
    '4': { text: 'United States', source: 'ai', confidence: 0.90 },
    '5': { text: 'Tourism', source: 'ai', confidence: 0.85 },
    '6': { text: '1-2 weeks', source: 'ai', confidence: 0.82 },
    '7': { text: 'Hotel Grand Lisboa\n123 Avenida de Lisboa\nMacau SAR\nReservation: March 20 – April 3, 2026', source: 'ai', confidence: 0.78 },
    '8': { text: 'No', source: 'ai', confidence: 0.95 },
    '9': { text: '', source: 'empty', confidence: 0 },
    '10': { text: 'TI-20260315-AJ4521', source: 'ai', confidence: 0.72 },
  },
  'patient-intake': {
    '1': { text: 'Alex Johnson', source: 'ai', confidence: 0.9 },
    '2': { text: '1992-06-15', source: 'ai', confidence: 0.85 },
    '3': { text: 'alex.johnson@email.com', source: 'ai', confidence: 0.9 },
    '4': { text: '+1 (555) 000-1234', source: 'ai', confidence: 0.85 },
    '5': { text: 'Dr. Morgan Lee', source: 'ai', confidence: 0.7 },
    '6': { text: 'No', source: 'ai', confidence: 0.9 },
    '7': { text: '', source: 'empty', confidence: 0 },
    '8': { text: 'None', source: 'ai', confidence: 0.6 },
    '9': { text: 'Self-pay', source: 'ai', confidence: 0.65 },
    '10': { text: 'Jordan Johnson', source: 'ai', confidence: 0.8 },
    '11': { text: '+1 (555) 222-7788', source: 'ai', confidence: 0.8 },
    '12': { text: 'I agree', source: 'ai', confidence: 0.95 },
  },
  'scholarship': {
    '1': { text: 'Alex Johnson', source: 'ai', confidence: 0.9 },
    '2': { text: 'alex.johnson@email.com', source: 'ai', confidence: 0.9 },
    '3': { text: 'State University', source: 'ai', confidence: 0.7 },
    '4': { text: 'Computer Science', source: 'ai', confidence: 0.85 },
    '5': { text: '3.8', source: 'ai', confidence: 0.8 },
    '6': { text: '2027', source: 'ai', confidence: 0.8 },
    '7': { text: 'I’m committed to using technology to create measurable impact. This scholarship would help me focus on research and community projects while maintaining strong academic performance.', source: 'ai', confidence: 0.85 },
    '8': { text: 'I built a volunteer-matching web app that reduced coordination time for local nonprofits. I led research, UI design, and implementation, and we shipped an MVP in 6 weeks.', source: 'ai', confidence: 0.85 },
    '9': { text: '', source: 'empty', confidence: 0 },
  },
  'insurance-quote': {
    '1': { text: 'Alex Johnson', source: 'ai', confidence: 0.9 },
    '2': { text: 'alex.johnson@email.com', source: 'ai', confidence: 0.9 },
    '3': { text: '2022', source: 'ai', confidence: 0.8 },
    '4': { text: 'Toyota', source: 'ai', confidence: 0.8 },
    '5': { text: 'Camry', source: 'ai', confidence: 0.75 },
    '6': { text: 'Yes', source: 'ai', confidence: 0.8 },
    '7': { text: '0', source: 'ai', confidence: 0.8 },
    '8': { text: '10,000–15,000', source: 'ai', confidence: 0.75 },
  },
  'b2b-demo': {
    '1': { text: 'Alex Johnson', source: 'ai', confidence: 0.9 },
    '2': { text: 'alex.johnson@acme.com', source: 'ai', confidence: 0.8 },
    '3': { text: 'Acme Corp', source: 'ai', confidence: 0.75 },
    '4': { text: '51-200', source: 'ai', confidence: 0.75 },
    '5': { text: 'We want to reduce manual form completion across recruiting and vendor onboarding, standardize responses, and improve consistency across teams.', source: 'ai', confidence: 0.8 },
    '6': { text: 'Afternoon', source: 'ai', confidence: 0.7 },
  },
  'rental-app': {
    '1': { text: 'Alex Johnson', source: 'ai', confidence: 0.9 },
    '2': { text: 'alex.johnson@email.com', source: 'ai', confidence: 0.9 },
    '3': { text: '+1 (555) 000-1234', source: 'ai', confidence: 0.85 },
    '4': { text: '123 Maple Street\nSpringfield, IL 62704', source: 'ai', confidence: 0.75 },
    '5': { text: '$6,500', source: 'ai', confidence: 0.7 },
    '6': { text: 'Employed', source: 'ai', confidence: 0.8 },
    '7': { text: 'No', source: 'ai', confidence: 0.85 },
    '8': { text: 'Taylor Reed — (555) 901-1122\nMorgan Lee — (555) 901-3344', source: 'ai', confidence: 0.7 },
  },
  'grant-application': {
    '1': { text: 'Bright Futures Foundation', source: 'ai', confidence: 0.75 },
    '2': { text: 'https://brightfutures.org', source: 'ai', confidence: 0.75 },
    '3': { text: 'grants@brightfutures.org', source: 'ai', confidence: 0.8 },
    '4': { text: 'We expand access to education resources for underserved youth through community-led programs and mentorship.', source: 'ai', confidence: 0.8 },
    '5': { text: '25000', source: 'ai', confidence: 0.75 },
    '6': { text: 'Funds will support staffing, materials, and program delivery for a 12-week after-school mentorship and tutoring pilot serving 120 students.', source: 'ai', confidence: 0.8 },
    '7': { text: 'Education', source: 'ai', confidence: 0.8 },
    '8': { text: 'Attendance rates, pre/post assessment gains, mentor retention, and parent satisfaction surveys.', source: 'ai', confidence: 0.75 },
  }
};

// Simple AI response simulator for chat
export const MOCK_CHAT_RESPONSES = [
  { trigger: 'shorten', response: 'I\'ve shortened the response to be more concise while keeping the key points. The word count was reduced by about 40%.' },
  { trigger: 'expand', response: 'I\'ve expanded the answer with more specific details and examples to make it more compelling.' },
  { trigger: 'professional', response: 'I\'ve rewritten the response in a more formal, professional tone suitable for corporate applications.' },
  { trigger: 'casual', response: 'Done! I\'ve made the tone more conversational and approachable.' },
  { trigger: 'bullet', response: 'I\'ve restructured the answer into clear bullet points for better readability.' },
  { trigger: 'default', response: 'I\'ve updated the response based on your instructions. Feel free to review and let me know if you\'d like further adjustments!' },
];
