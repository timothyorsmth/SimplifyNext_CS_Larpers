import caregiverData from '../../../mockData/mockCaregiverData.json';
import recipientData from '../../../mockData/mockRecipientData.json';

export async function fetchUserData() {
  return caregiverData;
}

export async function fetchCareRecipientData() {
  return recipientData;
}