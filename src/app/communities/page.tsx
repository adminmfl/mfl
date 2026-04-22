import { redirect } from 'next/navigation';

export default function CommunitiesPage() {
    // Redirect happens on server side
    redirect('/mfl-residential-wired.html');
    return null;
}