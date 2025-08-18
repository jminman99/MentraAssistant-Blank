import { clerkClient } from '@clerk/clerk-sdk-node';
import { requireUser } from '../_lib/auth.js';
import { applySimpleCors, handleOptions } from '../_lib/cors.js';

export const OPTIONS = handleOptions;

export default async function handler(req, res) {
  const user = requireUser(req);

  await applySimpleCors(req, res);

  const { id } = req.query;

  // Fetch the user from Clerk
  const clerkUser = await clerkClient.users.getUser(id);

  // Fetch the user from your database
  const dbUser = await clerkClient.users.getUser(id); // Replace with your actual DB query

  // Combine data (example)
  const combinedData = {
    clerkId: clerkUser.id,
    id: dbUser.id, // Assuming your DB user also has an ID
    email: clerkUser.emailAddresses?.[0]?.emailAddress,
    name: clerkUser.firstName,
  };

  res.status(200).json(combinedData);
}