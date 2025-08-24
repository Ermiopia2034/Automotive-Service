export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  });
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+\d{10,15}$/;
  return phoneRegex.test(phone);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Sort garages by distance (closest first)
export function sortGaragesByDistance(garages: GarageWithLocation[], userLat: number, userLng: number) {
  return garages
    .map(garage => ({
      ...garage,
      distance: calculateDistance(userLat, userLng, garage.latitude, garage.longitude)
    }))
    .sort((a, b) => a.distance - b.distance);
}

// Filter garages within a certain radius
export function filterGaragesWithinRadius(garages: GarageWithLocation[], userLat: number, userLng: number, radiusKm: number) {
  return garages.filter(garage => {
    const distance = calculateDistance(userLat, userLng, garage.latitude, garage.longitude);
    return distance <= radiusKm;
  });
}

// Get nearby garages with distance calculations
export function getNearbyGarages(garages: GarageWithLocation[], userLat: number, userLng: number, maxDistance?: number) {
  let nearbyGarages = garages.map(garage => ({
    ...garage,
    distance: calculateDistance(userLat, userLng, garage.latitude, garage.longitude)
  }));

  if (maxDistance && maxDistance > 0) {
    nearbyGarages = nearbyGarages.filter(garage => garage.distance <= maxDistance);
  }

  return nearbyGarages.sort((a, b) => a.distance - b.distance);
}

// Type definitions for garage operations
interface GarageWithLocation {
  latitude: number;
  longitude: number;
  [key: string]: unknown;
}

interface GarageService {
  service: {
    serviceName: string;
  };
  [key: string]: unknown;
}

interface GarageWithServices extends GarageWithLocation {
  services?: GarageService[];
}

// Format rating display
export function formatRating(rating: number): string {
  if (rating === 0) return 'No ratings';
  return `${rating.toFixed(1)}/10`;
}

// Calculate estimated travel time (rough estimation based on distance)
export function estimateTravelTime(distanceKm: number, avgSpeedKmh: number = 40): string {
  const timeInHours = distanceKm / avgSpeedKmh;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  if (timeInMinutes < 60) {
    return `${timeInMinutes} min`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    if (minutes === 0) {
      return `${hours} hr`;
    }
    return `${hours}h ${minutes}m`;
  }
}

// Search garages by name or service
export function searchGarages(garages: GarageWithServices[], searchTerm: string) {
  if (!searchTerm || searchTerm.trim() === '') {
    return garages;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return garages.filter(garage => {
    // Search in garage name
    if (garage.garageName && typeof garage.garageName === 'string' &&
        garage.garageName.toLowerCase().includes(lowerSearchTerm)) {
      return true;
    }
    
    // Search in services
    if (garage.services && garage.services.length > 0) {
      return garage.services.some((garageService: GarageService) =>
        garageService.service.serviceName.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    return false;
  });
}

// Validate location coordinates
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// Group garages by distance ranges
export function groupGaragesByDistance(garages: Array<GarageWithLocation & { distance?: number }>) {
  const groups = {
    nearby: [] as Array<GarageWithLocation & { distance?: number }>, // 0-5km
    close: [] as Array<GarageWithLocation & { distance?: number }>,  // 5-15km
    far: [] as Array<GarageWithLocation & { distance?: number }>     // 15km+
  };

  garages.forEach(garage => {
    if (garage.distance !== undefined) {
      if (garage.distance <= 5) {
        groups.nearby.push(garage);
      } else if (garage.distance <= 15) {
        groups.close.push(garage);
      } else {
        groups.far.push(garage);
      }
    }
  });

  return groups;
}