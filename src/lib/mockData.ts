import { User, Trip, ChatMessage, AIRecommendation } from '../types';

export const mockUser: User = {
  id: 'u1',
  email: 'demo@geziplan.app',
  fullName: 'Ahmet Yılmaz',
  avatarUrl: 'https://i.pravatar.cc/150?u=u1',
  bio: 'Doğa tutkunu, hafta sonu gezgini.',
  createdAt: new Date().toISOString()
};

export const mockTrips: Trip[] = [
  {
    id: 't1',
    title: 'Likya Yolu Yürüyüşü',
    description: 'Fethiye\'den başlayıp Ölüdeniz ve Kelebekler Vadisi üzerinden 3 günlük harika bir doğa yürüyüşü ve kamp macerası.',
    coverImageUrl: 'https://picsum.photos/seed/likya/800/400',
    startDate: '2026-07-15',
    startTime: '07:30',
    endDate: '2026-07-18',
    organizerId: 'u1',
    organizerName: 'Ahmet Yılmaz',
    organizerAvatar: 'https://i.pravatar.cc/150?u=u1',
    maxParticipants: 10,
    currentParticipants: 4,
    status: 'upcoming',
    category: 'doğa',
    rating: 4.8,
    tags: ['kamp', 'yürüyüş', 'deniz'],
    createdAt: new Date().toISOString(),
    startPoint: 'Fethiye, Muğla',
    endPoint: 'Kelebekler Vadisi, Fethiye',
    route: [
      { id: 'r1', latitude: 36.6217, longitude: 29.1164, name: 'Fethiye Merkez', order: 1 },
      { id: 'r2', latitude: 36.5458, longitude: 29.1192, name: 'Ölüdeniz', order: 2 },
      { id: 'r3', latitude: 36.4955, longitude: 29.1311, name: 'Kelebekler Vadisi', order: 3 }
    ],
    routeLegs: [
      { fromOrder: 1, toOrder: 2, durationMinutes: 25, distanceKm: 14.2 },
      { fromOrder: 2, toOrder: 3, durationMinutes: 18, distanceKm: 8.5 },
    ],
    totalDurationMinutes: 43,
    totalDistanceKm: 22.7,
    stopRecommendations: [
      {
        id: 'rec1',
        routePointOrder: 1,
        type: 'mola',
        title: 'Fethiye çarşısı — yerel kahvaltı',
        description: 'Yola çıkmadan önce simit ve çay molası.',
        durationMinutes: 40,
        suggestedById: 'u1',
        suggestedByName: 'Ahmet Yılmaz',
        suggestedByAvatar: 'https://i.pravatar.cc/150?u=u1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec2',
        routePointOrder: 2,
        type: 'mola',
        title: 'Ölüdeniz Lagün manzara molası',
        description: 'Fotoğraf ve kısa yüzme için ideal.',
        durationMinutes: 90,
        suggestedById: 'u2',
        suggestedByName: 'Ayşe Kaya',
        suggestedByAvatar: 'https://i.pravatar.cc/150?u=u2',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec3',
        routePointOrder: 2,
        type: 'konaklama',
        title: 'Kelebekler Vadisi kamp alanı',
        description: 'Çadırlarla gece konaklama — denize sıfır.',
        durationMinutes: 600,
        suggestedById: 'u1',
        suggestedByName: 'Ahmet Yılmaz',
        suggestedByAvatar: 'https://i.pravatar.cc/150?u=u1',
        createdAt: new Date().toISOString(),
      },
    ],
    pois: [],
    participants: []
  },
  {
    id: 't2',
    title: 'Kapadokya Balon Turu',
    description: 'Peri bacaları arasında sabahın ilk ışıklarıyla sıcak hava balonu turu ve ardından Göreme Açık Hava Müzesi gezisi.',
    coverImageUrl: 'https://picsum.photos/seed/kapadokya/800/400',
    startDate: '2026-08-05',
    startTime: '05:00',
    endDate: '2026-08-07',
    organizerId: 'u2',
    organizerName: 'Ayşe Kaya',
    organizerAvatar: 'https://i.pravatar.cc/150?u=u2',
    maxParticipants: 8,
    currentParticipants: 8,
    status: 'upcoming',
    category: 'tarih',
    rating: 5.0,
    tags: ['balon', 'müze', 'fotoğraf'],
    createdAt: new Date().toISOString(),
    startPoint: 'Göreme, Nevşehir',
    endPoint: 'Göreme, Nevşehir',
    route: [
      { id: 'r4', latitude: 38.6431, longitude: 34.8303, name: 'Göreme', order: 1 }
    ],
    routeLegs: [],
    pois: [],
    participants: []
  }
];

export const mockMessages: Record<string, ChatMessage[]> = {
  't1': [
    {
      id: 'm1',
      tripId: 't1',
      senderId: 'u2',
      senderName: 'Ayşe Kaya',
      senderAvatar: 'https://i.pravatar.cc/150?u=u2',
      content: 'Herkese merhaba! Yürüyüş için çadırları kimler getiriyor?',
      messageType: 'text',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'm2',
      tripId: 't1',
      senderId: 'u1',
      senderName: 'Ahmet Yılmaz',
      senderAvatar: 'https://i.pravatar.cc/150?u=u1',
      content: 'Ben 3 kişilik çadır getiriyorum.',
      messageType: 'text',
      createdAt: new Date(Date.now() - 3000000).toISOString()
    }
  ]
};

export const mockAIRecommendations: AIRecommendation[] = [
  {
    id: 'ai1',
    type: 'restoran',
    title: 'Tarihi Sultanahmet Köftecisi',
    description: '1920\'den beri hizmet veren meşhur köfteci. Ayasofya ziyaretinizden sonra harika bir durak.',
    rating: 4.6,
    imageUrl: 'https://picsum.photos/seed/kofte/400/300',
    priceLevel: 2,
    distance: '200m',
    tags: ['geleneksel', 'hızlı']
  }
];
