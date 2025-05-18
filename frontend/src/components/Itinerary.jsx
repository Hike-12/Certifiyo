import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FaPlane, FaCalendarAlt, FaMapMarkerAlt, FaSpinner,
  FaClock, FaSuitcase, FaUtensils, FaUmbrellaBeach,
  FaInfoCircle, FaDownload, FaShare, FaUser, FaSun,
  FaExchangeAlt, FaCloudSun, FaMoon, FaCloud, FaArrowRight, FaGlobeAmericas
} from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotatedmarker';

const Itinerary = () => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState('medium'); // 'low', 'medium', 'high'
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [hasGeneratedItinerary, setHasGeneratedItinerary] = useState(false);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const sourceMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const planeMarkerRef = useRef(null);
  const animationRef = useRef(null);
  const itineraryRef = useRef(null);
  const mapSectionRef = useRef(null);

  const interestOptions = [
    { value: 'nature', label: 'Nature & Outdoors' },
    { value: 'history', label: 'History & Culture' },
    { value: 'food', label: 'Food & Dining' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'relaxation', label: 'Relaxation & Wellness' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'nightlife', label: 'Nightlife' },
    { value: 'art', label: 'Arts & Museums' }
  ];

  // Helper function to toggle interests
  const toggleInterest = (value) => {
    if (interests.includes(value)) {
      setInterests(interests.filter(i => i !== value));
    } else {
      setInterests([...interests, value]);
    }
  };

  // Scroll to map section
  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to itinerary section
  const scrollToItinerary = () => {
    itineraryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Modify your map initialization useEffect
  useEffect(() => {
    // Only try to initialize when we have source, destination, the container is available, and we've generated an itinerary
    if (mapContainer.current && source && destination && hasGeneratedItinerary) {
      console.log("Initializing or updating map");

      // Give the DOM a moment to fully render before initializing map
      const initMapTimeout = setTimeout(() => {
        // If the map doesn't exist yet, create it
        if (!mapRef.current) {
          console.log("Creating new map instance");
          mapRef.current = L.map(mapContainer.current).setView([20, 0], 2);

          // Use a dark theme map style
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
          }).addTo(mapRef.current);

          // Create custom plane icon
          const planeIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/1342/1342659.png',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          // Add invisible plane marker (will be shown during animation)
          planeMarkerRef.current = L.marker([0, 0], {
            icon: planeIcon,
            rotationAngle: 0,
            rotationOrigin: 'center center'
          });
        } else {
          // If map already exists, make sure it's properly sized for its container
          console.log("Map already exists, invalidating size");
          mapRef.current.invalidateSize(true);
        }

        // Always update map with current source and destination
        updateMap(source, destination);
      }, 100); // Short delay to ensure container is ready

      return () => clearTimeout(initMapTimeout);
    }
  }, [mapContainer.current, source, destination, hasGeneratedItinerary]);

  useEffect(() => {
    // Clean up the map when component unmounts
    return () => {
      console.log("Component unmounting, cleaning up map");
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // Function to get coordinates from location name
  const getCoordinates = async (location) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: location,
          format: 'json',
          limit: 1
        }
      });

      if (response.data && response.data.length > 0) {
        return {
          coords: [parseFloat(response.data[0].lat), parseFloat(response.data[0].lon)],
          country: response.data[0].display_name.split(', ').slice(-1)[0]
        };
      }
      throw new Error(`Location not found: ${location}`);
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };

  // Function to fetch dummy weather information
  const fetchWeatherInfo = async (country) => {
    // This would normally call a weather API
    const weatherTypes = ['Sunny', 'Partly Cloudy', 'Rainy', 'Clear', 'Stormy'];
    const randomTemp = Math.floor(Math.random() * 35) + 5; // 5-40°C
    const weatherType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

    return {
      temperature: randomTemp,
      condition: weatherType,
      humidity: Math.floor(Math.random() * 60) + 30 // 30-90%
    };
  };

  // Function to fetch currency information
  const fetchCurrencyInfo = async (country) => {
    const currencyMap = {
      'United States': { code: 'USD', symbol: '$', name: 'US Dollar' },
      'France': { code: 'EUR', symbol: '€', name: 'Euro' },
      'Japan': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
      'United Kingdom': { code: 'GBP', symbol: '£', name: 'British Pound' },
      'Australia': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
      'Canada': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
      'China': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
      'India': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
      'Brazil': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
      'Mexico': { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
    };

    // Default currency info
    let currencyInfo = { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: 1.0 };

    // Try to find the country in our map
    for (const [key, value] of Object.entries(currencyMap)) {
      if (country.includes(key)) {
        currencyInfo = {
          ...value,
          exchangeRate: (Math.random() * 2 + 0.5).toFixed(2) // Random exchange rate between 0.5 and 2.5
        };
        break;
      }
    }

    return currencyInfo;
  };

  // Enhanced function to generate itinerary with Gemini API
  const generateItinerary = async (sourceName, destName, days, travelersCount, budgetLevel, interestsList) => {
    try {
      // Get API key from environment variable
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      if (!API_KEY) {
        console.error('Missing Gemini API key in environment variables');
        throw new Error('API key not configured');
      }

      const interestsText = interestsList.length > 0
        ? `Interests include: ${interestsList.join(', ')}.`
        : '';

      const budgetText = {
        'low': 'on a limited budget (budget-friendly options)',
        'medium': 'with a moderate budget (mid-range options)',
        'high': 'with a luxury budget (high-end experiences)'
      }[budgetLevel];

      const prompt = `You are a travel expert who creates detailed itineraries. Create a ${days}-day travel itinerary from ${sourceName} to ${destName} for ${travelersCount} travelers ${budgetText}. ${interestsText} Include estimated flight time in hours, approximate distance in km, and 3 activities for each day that are appropriate for the destination and align with the travelers' interests and budget. Also include a recommended hotel or accommodation for each night.

      Return as JSON with this structure:
      {
        "flightTime": number,
        "distance": number,
        "days": [
          {
            "day": number,
            "activities": [string, string, string],
            "accommodation": {
              "name": string,
              "description": string
            }
          }
        ],
        "travelTips": [string, string, string]
      }`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        }
      );

      // Parse the response
      let itineraryData;

      try {
        // Extract the text content from Gemini's response format
        const textContent = response.data.candidates[0].content.parts[0].text;

        // Find JSON content within the response (in case it's wrapped in markdown or other text)
        const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/) ||
                          textContent.match(/{[\s\S]*}/);

        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textContent;

        // Parse the JSON
        itineraryData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        throw new Error('Invalid response format from Gemini API');
      }

      // Return in expected format
      return {
        flightTime: itineraryData.flightTime,
        distance: itineraryData.distance,
        days: itineraryData.days,
        travelTips: itineraryData.travelTips || [
          "Remember to check visa requirements before traveling",
          "Currency exchange rates may vary, check before departure",
          "Always have travel insurance for international trips"
        ]
      };
    } catch (error) {
      console.error('Error calling Gemini API:', error);

      // More detailed fallback data if API call fails
      return {
        flightTime: Math.floor(Math.random() * 10) + 2,
        distance: Math.floor(Math.random() * 5000) + 500,
        days: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          activities: [
            `Explore ${destName}'s city center`,
            `Try local cuisine in ${destName}`,
            `Visit popular tourist attractions in ${destName}`
          ],
          accommodation: {
            name: `${destName} Central Hotel`,
            description: "Comfortable accommodation in a central location"
          }
        })),
        travelTips: [
          "Remember to check visa requirements before traveling",
          "Currency exchange rates may vary, check before departure",
          "Always have travel insurance for international trips"
        ]
      };
    }
  };

  // Calculate bearing between two points
  const calculateBearing = (startLat, startLng, destLat, destLng) => {
    const toRad = (value) => (value * Math.PI) / 180;
    startLat = toRad(startLat);
    startLng = toRad(startLng);
    destLat = toRad(destLat);
    destLng = toRad(destLng);

    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x =
      Math.cos(startLat) * Math.sin(destLat) -
      Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let bearing = Math.atan2(y, x);
    bearing = (bearing * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
  };

  // Updated map function
  const updateMap = async (sourceLocation, destLocation) => {
    if (!mapContainer.current) {
      console.error("Map container is not available");
      return;
    }

    if (!mapRef.current) {
      console.log("Initializing map on demand");
      mapRef.current = L.map(mapContainer.current).setView([20, 0], 2);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(mapRef.current);
    }

    console.log("Updating map with:", sourceLocation, destLocation);
    try {
      // Get coordinates and country info for source and destination
      const sourceData = await getCoordinates(sourceLocation);
      const destData = await getCoordinates(destLocation);

      console.log("Source data:", sourceData);
      console.log("Destination data:", destData);

      const sourceCoords = sourceData.coords;
      const destCoords = destData.coords;

      // Fetch weather and currency info for destination
      const weatherData = await fetchWeatherInfo(destData.country);
      const currencyData = await fetchCurrencyInfo(destData.country);

      // Set state with this information
      setWeatherInfo(weatherData);
      setCurrency(currencyData);

      // Use coordinates for Leaflet [lat, lng] format
      const sourceLatLng = [sourceCoords[0], sourceCoords[1]];
      const destLatLng = [destCoords[0], destCoords[1]];

      console.log("Source LatLng:", sourceLatLng);
      console.log("Dest LatLng:", destLatLng);

      // Remove existing markers and route if they exist
      if (sourceMarkerRef.current) mapRef.current.removeLayer(sourceMarkerRef.current);
      if (destMarkerRef.current) mapRef.current.removeLayer(destMarkerRef.current);
      if (routeLayerRef.current) mapRef.current.removeLayer(routeLayerRef.current);
      if (planeMarkerRef.current) planeMarkerRef.current.removeFrom(mapRef.current);
      if (animationRef.current) clearInterval(animationRef.current);

      // Use custom markers with our color scheme
      sourceMarkerRef.current = L.circleMarker(sourceLatLng, {
        radius: 8,
        fillColor: '#9cadce',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapRef.current)
        .bindPopup(`<b>${sourceLocation}</b><br>Starting point`);

      destMarkerRef.current = L.circleMarker(destLatLng, {
        radius: 8,
        fillColor: '#ff9cadce',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapRef.current)
        .bindPopup(`<b>${destLocation}</b><br>Destination`);

      // Draw a curved route line for a more realistic flight path
      const controlPoint = [
        (sourceLatLng[0] + destLatLng[0]) / 2 + (Math.random() * 10 - 5),
        (sourceLatLng[1] + destLatLng[1]) / 2 + (Math.random() * 10 - 5)
      ];

      // Create an arc path between the points
      const pointsArray = [];
      const steps = 100;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        // Quadratic Bezier curve formula
        const lat = Math.pow(1-t, 2) * sourceLatLng[0] +
                  2 * (1-t) * t * controlPoint[0] +
                  Math.pow(t, 2) * destLatLng[0];

        const lng = Math.pow(1-t, 2) * sourceLatLng[1] +
                  2 * (1-t) * t * controlPoint[1] +
                  Math.pow(t, 2) * destLatLng[1];

        pointsArray.push([lat, lng]);
      }

      // Draw route line with our color scheme
      routeLayerRef.current = L.polyline(pointsArray, {
        color: '#9cadce',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10',
        lineJoin: 'round'
      }).addTo(mapRef.current);

      // Create a simple plane icon (more reliable than images)
      const planeIcon = L.divIcon({
        className: 'plane-icon',
        html: '<div style="color: #9cadce; font-size: 20px; transform: rotate(0deg);">✈️</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      // Add plane marker
      planeMarkerRef.current = L.marker(sourceLatLng, {
        icon: planeIcon
      }).addTo(mapRef.current);

      // Fit map bounds to show both markers
      const bounds = L.latLngBounds(sourceLatLng, destLatLng);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });

      // Animate plane along the route
      let step = 0;
      animationRef.current = setInterval(() => {
        if (step >= pointsArray.length - 1) {
          clearInterval(animationRef.current);
          return;
        }

        planeMarkerRef.current.setLatLng(pointsArray[step]);

        // Update rotation (simpler approach for emoji)
        if (step < pointsArray.length - 1) {
          const currentPoint = pointsArray[step];
          const nextPoint = pointsArray[step + 1];
          const bearing = calculateBearing(
            currentPoint[0], currentPoint[1],
            nextPoint[0], nextPoint[1]
          );

          // Update the HTML with new rotation
          const planeDiv = L.DomUtil.get(planeMarkerRef.current._icon).querySelector('div');
          if (planeDiv) {
            planeDiv.style.transform = `rotate(${bearing}deg)`;
          }
        }

        step++;
      }, 50);

    } catch (error) {
      console.error('Error updating map:', error);
      setError('Failed to show locations on map. Please check your inputs.');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update map with source and destination
      await updateMap(source, destination);

      // Generate itinerary using Gemini API
      const generatedItinerary = await generateItinerary(
        source,
        destination,
        days,
        travelers,
        budget,
        interests
      );

      setItinerary(generatedItinerary);
      setHasGeneratedItinerary(true);

    } catch (err) {
      console.error('Error:', err);
      setError('Failed to generate itinerary. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to download itinerary as PDF (simplified to text for this demo)
  const downloadItinerary = () => {
    if (!itinerary) return;

    // Create text content
    let content = `TRAVEL ITINERARY: ${source} to ${destination}\n`;
    content += `Duration: ${days} days | Travelers: ${travelers}\n`;
    content += `Flight Time: ${itinerary.flightTime} hours | Distance: ${itinerary.distance} km\n\n`;

    // Add day by day information
    itinerary.days.forEach(day => {
      content += `DAY ${day.day}\n`;
      day.activities.forEach((activity, i) => {
        content += `Activity ${i+1}: ${activity}\n`;
      });
      content += `Accommodation: ${day.accommodation.name} - ${day.accommodation.description}\n\n`;
    });

    // Add travel tips
    content += "TRAVEL TIPS:\n";
    itinerary.travelTips.forEach((tip, i) => {
      content += `- ${tip}\n`;
    });

    // Create a blob and trigger download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${destination}-itinerary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to share itinerary (simplified mock)
  const shareItinerary = () => {
    alert(`Share feature activated! In a real app, this would open sharing options to email or social media.`);
  };

  // Get weather icon based on condition
  const getWeatherIcon = (condition) => {
    if (!condition) return <FaCloud />;

    const conditionLower = condition.toLowerCase();

    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
      return <FaSun />;
    } else if (conditionLower.includes('night') || conditionLower.includes('dark')) {
      return <FaMoon />;
    } else {
      return <FaCloud />;
    }
  };

  // Currency Converter Component
  const CurrencyConverter = ({ source, destination }) => {
    const [amount, setAmount] = useState(1);
    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('EUR');
    const [convertedAmount, setConvertedAmount] = useState(null);
    const [exchangeRate, setExchangeRate] = useState(null);

    useEffect(() => {
      // Fetch exchange rate data from an API
      const fetchExchangeRate = async () => {
        try {
          // In a real app, you would call a currency exchange API here
          // For this example, we'll use a mock exchange rate
          const mockRate = 0.85; // 1 USD = 0.85 EUR
          setExchangeRate(mockRate);
          setConvertedAmount((amount * mockRate).toFixed(2));
        } catch (error) {
          console.error('Error fetching exchange rate:', error);
        }
      };

      fetchExchangeRate();
    }, [amount, fromCurrency, toCurrency]);

    return (
      <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Currency Converter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-1" style={{ color: '#9cadce' }}>Amount</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="w-full p-2 rounded-md text-white"
              style={{ backgroundColor: '#111111', borderColor: '#9cadce', borderWidth: '1px' }}
            />
          </div>
          <div>
            <label htmlFor="fromCurrency" className="block text-sm font-medium mb-1" style={{ color: '#9cadce' }}>From</label>
            <select
              id="fromCurrency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full p-2 rounded-md text-white"
              style={{ backgroundColor: '#111111', borderColor: '#9cadce', borderWidth: '1px' }}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
            </select>
          </div>
          <div>
            <label htmlFor="toCurrency" className="block text-sm font-medium mb-1" style={{ color: '#9cadce' }}>To</label>
            <select
              id="toCurrency"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full p-2 rounded-md text-white"
              style={{ backgroundColor: '#111111', borderColor: '#9cadce', borderWidth: '1px' }}
            >
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - US Dollar</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
            </select>
          </div>
        </div>
        {convertedAmount && (
          <div className="mt-4 p-4 rounded-md" style={{ backgroundColor: '#111111' }}>
            <p className="text-lg font-medium" style={{ color: '#9cadce' }}>
              {amount} {fromCurrency} = {convertedAmount} {toCurrency}
            </p>
            <p className="text-sm" style={{ color: '#9cadce' }}>
              Exchange Rate: 1 {fromCurrency} = {exchangeRate} {toCurrency}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Weather Find Component
  const WeatherFind = ({ location }) => {
    const [weatherData, setWeatherData] = useState(null);

    useEffect(() => {
      // Fetch weather data from an API
      const fetchWeatherData = async () => {
        try {
          // In a real app, you would call a weather API here
          // For this example, we'll use mock data
          const mockData = {
            temperature: 22,
            condition: 'Sunny',
            humidity: 65,
            windSpeed: 10
          };
          setWeatherData(mockData);
        } catch (error) {
          console.error('Error fetching weather data:', error);
        }
      };

      fetchWeatherData();
    }, [location]);

    return (
      <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Weather in {location}</h2>
        {weatherData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: '#9cadce' }}>
                <FaSun className="text-black text-2xl" />
              </div>
              <div>
                <p className="text-lg font-medium" style={{ color: '#9cadce' }}>{weatherData.condition}</p>
                <p className="text-sm" style={{ color: '#9cadce' }}>{weatherData.temperature}°C</p>
              </div>
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9cadce' }}>Humidity: {weatherData.humidity}%</p>
              <p className="text-sm" style={{ color: '#9cadce' }}>Wind Speed: {weatherData.windSpeed} km/h</p>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#9cadce' }}>Loading weather data...</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#080808' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: '#ffffff' }}>
            <motion.span
              className="inline-block px-4 py-1 rounded-lg shadow-md"
              style={{ backgroundColor: '#9cadce' }}
              whileHover={{ scale: 1.05, rotate: -3 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <FaPlane className="inline-block mr-2" /> Wanderlust
            </motion.span>
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl sm:mt-4" style={{ color: '#9cadce' }}>
            Your AI-powered travel planner for memorable adventures
          </p>
        </motion.div>

        {/* SECTION 1: TRIP DETAILS FORM */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="rounded-2xl shadow-xl overflow-hidden mb-8"
          style={{ backgroundColor: '#111111', borderColor: '#9cadce', borderWidth: '1px' }}
        >
          <div className="p-6">
            {/* Trip Form */}
            <div>
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Plan Your Adventure</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="source" className="block text-sm font-medium" style={{ color: '#9cadce' }}>
                      Starting From
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaMapMarkerAlt style={{ color: '#9cadce' }} />
                      </div>
                      <input
                        type="text"
                        id="source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 sm:text-sm rounded-lg text-white"
                        style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
                        placeholder="New York, Tokyo..."
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="destination" className="block text-sm font-medium" style={{ color: '#9cadce' }}>
                      Destination
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaMapMarkerAlt style={{ color: '#9cadce' }} />
                      </div>
                      <input
                        type="text"
                        id="destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 sm:text-sm rounded-lg text-white"
                        style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
                        placeholder="Paris, Bangkok..."
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="days" className="block text-sm font-medium" style={{ color: '#9cadce' }}>
                      Trip Duration (Days)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt style={{ color: '#9cadce' }} />
                      </div>
                      <input
                        type="number"
                        id="days"
                        min="1"
                        max="30"
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="block w-full pl-10 pr-4 py-3 sm:text-sm rounded-lg text-white"
                        style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="travelers" className="block text-sm font-medium" style={{ color: '#9cadce' }}>
                      Number of Travelers
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaUser style={{ color: '#9cadce' }} />
                      </div>
                      <input
                        type="number"
                        id="travelers"
                        min="1"
                        max="20"
                        value={travelers}
                        onChange={(e) => setTravelers(parseInt(e.target.value))}
                        className="block w-full pl-10 pr-4 py-3 sm:text-sm rounded-lg text-white"
                        style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#9cadce' }}>Budget Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <input
                        type="radio"
                        id="budget-low"
                        name="budget"
                        className="sr-only"
                        checked={budget === 'low'}
                        onChange={() => setBudget('low')}
                      />
                      <label
                        htmlFor="budget-low"
                        className={`cursor-pointer flex flex-col items-center justify-center w-full p-3 rounded-lg ${
                          budget === 'low'
                            ? 'bg-[#1a1a1a] border-2 border-[#9cadce] text-[#9cadce]'
                            : 'border border-gray-600 hover:border-[#9cadce] text-gray-300'
                        }`}
                      >
                        <span className="block text-sm font-medium">Economy</span>
                        <span className="block text-xs mt-1">$ Budget-friendly</span>
                      </label>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <input
                        type="radio"
                        id="budget-medium"
                        name="budget"
                        className="sr-only"
                        checked={budget === 'medium'}
                        onChange={() => setBudget('medium')}
                      />
                      <label
                        htmlFor="budget-medium"
                        className={`cursor-pointer flex flex-col items-center justify-center w-full p-3 rounded-lg ${
                          budget === 'medium'
                          ? 'bg-[#1a1a1a] border-2 border-[#9cadce] text-[#9cadce]'
                            : 'border border-gray-600 hover:border-[#9cadce] text-gray-300'
                        }`}
                      >
                        <span className="block text-sm font-medium">Standard</span>
                        <span className="block text-xs mt-1">$$ Mid-range</span>
                      </label>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <input
                        type="radio"
                        id="budget-high"
                        name="budget"
                        className="sr-only"
                        checked={budget === 'high'}
                        onChange={() => setBudget('high')}
                      />
                      <label
                        htmlFor="budget-high"
                        className={`cursor-pointer flex flex-col items-center justify-center w-full p-3 rounded-lg ${
                          budget === 'high'
                            ? 'bg-[#1a1a1a] border-2 border-[#9cadce] text-[#9cadce]'
                            : 'border border-gray-600 hover:border-[#9cadce] text-gray-300'
                        }`}
                      >
                        <span className="block text-sm font-medium">Luxury</span>
                        <span className="block text-xs mt-1">$$$ Premium</span>
                      </label>
                    </motion.div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#9cadce' }}>Travel Interests</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {interestOptions.map((option) => (
                      <motion.div key={option.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                        <input
                          type="checkbox"
                          id={`interest-${option.value}`}
                          className="sr-only"
                          checked={interests.includes(option.value)}
                          onChange={() => toggleInterest(option.value)}
                        />
                        <label
                          htmlFor={`interest-${option.value}`}
                          className={`cursor-pointer flex items-center justify-center w-full px-3 py-2 text-xs rounded-lg ${
                            interests.includes(option.value)
                              ? 'bg-[#1a1a1a] text-[#9cadce] border-2 border-[#9cadce]'
                              : 'border border-gray-600 text-gray-300 hover:border-[#9cadce]'
                          }`}
                        >
                          {option.label}
                        </label>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <motion.button
                    type="submit"
                    disabled={loading || !source || !destination}
                    className={`w-full py-3 px-6 flex items-center justify-center rounded-md shadow-sm font-medium ${
                      loading || !source || !destination
                        ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                        : 'bg-[#9cadce] hover:bg-opacity-80 text-black'
                    }`}
                    whileHover={!loading && source && destination ? { scale: 1.02 } : {}}
                    whileTap={!loading && source && destination ? { scale: 0.98 } : {}}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" /> Generating Itinerary...
                      </>
                    ) : (
                      'Create Travel Plan'
                    )}
                  </motion.button>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-900 bg-opacity-30 text-red-400 rounded-lg border border-red-700"
                  >
                    <p className="flex items-center">
                      <FaInfoCircle className="mr-2" /> {error}
                    </p>
                  </motion.div>
                )}
              </form>
            </div>

            {/* Travel Tips and Info */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Travel Insights</h2>
              <motion.div
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
                whileHover={{ boxShadow: '0 0 15px rgba(156, 173, 206, 0.3)' }}
              >
                <h3 className="text-lg font-medium mb-4" style={{ color: '#9cadce' }}>Tips for Amazing Trips</h3>
                <ul className="space-y-3">
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <FaSuitcase className="mt-1 mr-3" style={{ color: '#9cadce' }} />
                    <p className="text-gray-300">Pack light and smart. Check the weather forecast for your destination.</p>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <FaUtensils className="mt-1 mr-3" style={{ color: '#9cadce' }} />
                    <p className="text-gray-300">Research local cuisine and try regional specialties for an authentic experience.</p>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <FaUmbrellaBeach className="mt-1 mr-3" style={{ color: '#9cadce' }} />
                    <p className="text-gray-300">Balance planned activities with free time for spontaneous exploration.</p>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <FaClock className="mt-1 mr-3" style={{ color: '#9cadce' }} />
                    <p className="text-gray-300">Adjust to the local time zone quickly by staying awake until the local night time.</p>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <FaSun className="mt-1 mr-3" style={{ color: '#9cadce' }} />
                    <p className="text-gray-300">Protect yourself from the sun with sunscreen, even on cloudy days at popular destinations.</p>
                  </motion.li>
                </ul>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Map View Section */}
        {hasGeneratedItinerary && (
          <div ref={mapSectionRef} className="mb-8">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Your Journey Map</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <motion.div
                  key="map"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  ref={mapContainer}
                  className="h-96 md:h-[500px] w-full rounded-lg border border-[#9cadce] shadow-lg overflow-hidden"
                  style={{ boxShadow: '0 0 20px rgba(156, 173, 206, 0.2)' }}
                ></motion.div>
              </div>
              <div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="rounded-lg shadow-md p-4 mb-6"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
                >
                  <h3 className="text-lg font-medium mb-4" style={{ color: '#9cadce' }}>Trip Overview</h3>
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                          <FaPlane className="text-black text-sm" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">From: {source}</p>
                          <p className="text-sm font-medium text-white">To: {destination}</p>
                        </div>
                      </div>
                    </motion.div>

                    {itinerary && (
                      <>
                        <motion.div
                          whileHover={{ x: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                              <FaClock className="text-black text-sm" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Flight Duration</p>
                              <p className="text-sm font-medium text-white">{itinerary.flightTime} hours</p>
                            </div>
                          </div>
                        </motion.div>

                        <motion.div
                          whileHover={{ x: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                              <FaMapMarkerAlt className="text-black text-sm" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Distance</p>
                              <p className="text-sm font-medium text-white">{itinerary.distance} kilometers</p>
                            </div>
                          </div>
                        </motion.div>
                      </>
                    )}

                    {weatherInfo && (
                      <motion.div
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                            {getWeatherIcon(weatherInfo.condition)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Weather in {destination}</p>
                            <p className="text-sm font-medium text-white">
                              {weatherInfo.condition}, {weatherInfo.temperature}°C
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {currency && (
                      <motion.div
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                            <span className="text-black font-bold">{currency.symbol}</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Local Currency</p>
                            <p className="text-sm font-medium text-white">
                              {currency.name} ({currency.code})
                            </p>
                            <p className="text-xs text-gray-500">
                              1 USD = {currency.exchangeRate} {currency.code}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                <motion.button
                  onClick={scrollToItinerary}
                  className="w-full py-3 px-4 flex items-center justify-center rounded-md shadow-sm font-medium text-black"
                  style={{ backgroundColor: '#9cadce' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!itinerary}
                >
                  <FaArrowRight className="mr-2" /> View Detailed Itinerary
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* Itinerary Section */}
        {itinerary && (
          <div ref={itineraryRef} className="mb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between mb-6"
            >
              <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                {source} to {destination} Itinerary
              </h2>
              <div className="flex space-x-2">
                <motion.button
                  onClick={downloadItinerary}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-black"
                  style={{ backgroundColor: '#9cadce' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaDownload className="mr-2" /> Download
                </motion.button>
                <motion.button
                  onClick={shareItinerary}
                  className="inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm"
                  style={{ borderColor: '#9cadce', color: '#9cadce' }}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(156, 173, 206, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaShare className="mr-2" /> Share
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4 rounded-lg mb-6"
              style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
            >
              <div className="flex flex-wrap items-center justify-center md:justify-between gap-4">
                <motion.div
                  className="flex items-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                    <FaCalendarAlt className="text-black" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#9cadce' }}>Duration</p>
                    <p className="text-sm font-bold text-white">{days} Days</p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                    <FaUser className="text-black" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#9cadce' }}>Travelers</p>
                    <p className="text-sm font-bold text-white">{travelers} Persons</p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                    <FaClock className="text-black" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#9cadce' }}>Flight Time</p>
                    <p className="text-sm font-bold text-white">{itinerary.flightTime} Hours</p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#9cadce' }}>
                    <FaMapMarkerAlt className="text-black" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#9cadce' }}>Distance</p>
                    <p className="text-sm font-bold text-white">{itinerary.distance} km</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Day-by-day itinerary */}
            <div className="space-y-8 mb-8">
              {itinerary.days.map((day, index) => (
                <motion.div
                  key={index}
                  className="rounded-lg shadow-md overflow-hidden"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  whileHover={{ boxShadow: '0 0 15px rgba(156, 173, 206, 0.2)' }}
                >
                  <div className="px-4 py-3" style={{ backgroundColor: '#9cadce' }}>
                    <h3 className="font-semibold text-black">Day {day.day}</h3>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium text-[#9cadce] mb-3">Activities</h4>
                    <ul className="space-y-3 mb-4">
                      {day.activities.map((activity, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + (i * 0.1) }}
                          whileHover={{ x: 5 }}
                        >
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium mr-3" style={{ backgroundColor: '#9cadce', color: 'black' }}>
                            {i + 1}
                          </span>
                          <span className="text-gray-300">{activity}</span>
                        </motion.li>
                      ))}
                    </ul>

                    <h4 className="font-medium text-[#9cadce] mb-2">Accommodation</h4>
                    <motion.div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: '#111111' }}
                      whileHover={{ backgroundColor: '#1e1e1e' }}
                    >
                      <p className="font-medium text-[#9cadce]">{day.accommodation.name}</p>
                      <p className="text-sm text-gray-400">{day.accommodation.description}</p>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Travel Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="rounded-lg p-4 mb-6"
              style={{ backgroundColor: '#1a1a1a', borderColor: '#9cadce', borderWidth: '1px' }}
            >
              <h3 className="font-semibold mb-3" style={{ color: '#9cadce' }}>Travel Tips for {destination}</h3>
              <ul className="space-y-2">
                {itinerary.travelTips.map((tip, index) => (
                  <motion.li
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (index * 0.1) }}
                    whileHover={{ x: 5 }}
                  >
                    <FaInfoCircle className="text-[#9cadce] mt-1 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">{tip}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        )}

        {/* Weather Section */}
        {source && destination && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <WeatherFind location={destination} />
          </motion.div>
        )}

        {/* Currency Section */}
        {source && destination && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CurrencyConverter source={source} destination={destination} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Itinerary;
