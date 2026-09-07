export const MOD_FEE = 5000;
export const MOD_TYPES: { key: string; label: string; desc: string; cur: string[]; neu: string[] }[] = [
{ key: 'name', label: 'Change of Name', desc: 'Update First Name, Surname, or Middle Name on your NIN record.', cur: ['current_first_name', 'current_last_name', 'current_middle_name'], neu: ['new_firstname', 'new_lastname', 'new_middlename'] },
{ key: 'phone', label: 'Change of Phone', desc: 'Link a new active phone number to your National Identity record.', cur: ['current_phone'], neu: ['new_phone'] },
{ key: 'address', label: 'Change of Address', desc: 'Update your registered residential address, State, and LGA.', cur: ['current_address'], neu: ['new_address'] },
{ key: 'dob', label: 'Change of DOB', desc: 'Correct the date of birth on your NIN record.', cur: ['current_dob'], neu: ['new_dob'] },
{ key: 'gender', label: 'Change of Gender', desc: 'Update the gender field on your NIN record.', cur: ['current_gender'], neu: ['new_gender'] },
{ key: 'name_dob', label: 'Name + DOB', desc: 'Change name and date of birth in one request.', cur: ['current_first_name', 'current_last_name', 'current_middle_name', 'current_dob'], neu: ['new_firstname', 'new_lastname', 'new_middlename', 'new_dob'] },
];
export const pretty = (f: string) => f.replace(/^(current_|new_)/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
