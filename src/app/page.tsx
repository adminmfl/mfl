import { redirect } from 'next/navigation';

export default function LandingPage() {
  // Redirect happens on server side
  redirect('/mfl-landing-wired.html');
  return null;
}
