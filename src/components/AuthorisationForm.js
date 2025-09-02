import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function AuthorisationForm({ user }) {
  const [competitionDate, setCompetitionDate] = useState('');
  const [event, setEvent] = useState('');
  const [club, setClub] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'authorisation_requests'), {
        competition_date: competitionDate,
        event,
        club,
        userUid: user.uid,        // <-- Add this
        userEmail: user.email,    // optional
        submittedAt: serverTimestamp()
      });

      alert("Authorisation request sent!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Authorisation Request</h2>
      <input value={competitionDate} onChange={(e) => setCompetitionDate(e.target.value)} placeholder="Competition Date" />
      <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Event" />
      <input value={club} onChange={(e) => setClub(e.target.value)} placeholder="Club" />
      <button type="submit">Submit</button>
    </form>
  );
}

export default AuthorisationForm;
