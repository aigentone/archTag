'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
interface CatHealthProfile {
  id: string;
  name: string;
  breed?: string;
  age?: number;
  personality?: string;
  weight?: number;
  healthConditions?: string[];
  medications?: string[];
  vaccinationStatus?: string;
  dietaryRestrictions?: string[];
}

interface Message {
  text: string;
  sender: 'user' | 'cat';
  catId: string;
  timestamp: string; 
}

interface SensorData {
  temperature: number;
  activity: 'sleeping' | 'active' | 'eating' | 'resting';
  location: string;
  timestamp: Date;
}

interface CreateProfileForm {
  name: string;
  breed?: string;
  age?: number;
  personality?: string;
  weight?: number;
  healthConditions?: string[];
  medications?: string[];
  vaccinationStatus?: string;
  dietaryRestrictions?: string[];
}

export default function ChatWithPet() {
  const [catProfiles, setCatProfiles] = useState<CatHealthProfile[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<Record<string, SensorData>>({});
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState<CreateProfileForm>({
    name: '',
    breed: '',
    age: undefined,
    personality: '',
    weight: undefined,
    healthConditions: [],
    medications: [],
    vaccinationStatus: '',
    dietaryRestrictions: []
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedCatId) {
      const storageKey = `chatHistory_${selectedCatId}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([]); // Reset messages when switching to a new cat
      }
    }
  }, [selectedCatId]);

  useEffect(() => {
    if (selectedCatId) {
      const storageKey = `chatHistory_${selectedCatId}`;
      localStorage.setItem(storageKey, JSON.stringify(selectedCatMessages));
    }
  }, [messages, selectedCatId]);

  const createProfile = async () => {
    if (!profileForm.name) {
      setError("Name is required to create a profile");
      return;
    }

    try {
      setError(null);
      console.log('Creating profile for:', profileForm);
      const response = await fetch('/api/cat/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const data = await response.json();
      console.log('Profile created:', data);
      const newProfile = { 
        id: data.catId, 
        ...profileForm 
        };
        setCatProfiles(prev => [...prev, newProfile]);
        setSelectedCatId(data.catId);
        setShowProfileForm(false);
      
      console.log('Starting sensor monitoring for catId:', data.catId);
      pollSensorData(data.catId);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const pollSensorData = async (catId: string) => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch(`/api/sensor/${catId}`);
        const data = await response.json();
        setSensorData(prev => ({
          ...prev,
          [catId]: data
        }));
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    };

    await fetchSensorData();
    const interval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(interval);
  };


  useEffect(() => {
    const loadProfiles = async () => {
      try {
        // Use the listProfiles endpoint we see in your server code
        const response = await fetch('/api/cat/profiles');
        const profiles = await response.json();
        setCatProfiles(profiles);
        
        // Start polling sensor data for all existing cats
        profiles.forEach((profile: CatHealthProfile) => {
          pollSensorData(profile.id);
        });
      } catch (error) {
        console.error('Error loading profiles:', error);
      }
    };

    loadProfiles();
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedCatId) return;

    try {
      setLoading(true);
      const newUserMessage: Message = {
        text: inputMessage,
        sender: 'user',
        catId: selectedCatId,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newUserMessage]);
      setInputMessage('');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: inputMessage, 
          catId: selectedCatId 
        })
      });

      const data = await response.json();
      const newCatMessage: Message = {
        text: data.response,
        sender: 'cat',
        catId: selectedCatId,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newCatMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const selectedCatMessages = messages.filter(msg => msg.catId === selectedCatId);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'healthConditions' || name === 'medications' || name === 'dietaryRestrictions') {
      setProfileForm(prev => ({
        ...prev,
        [name]: value.split(',').map(item => item.trim()).filter(Boolean)
      }));
    } else if (name === 'age' || name === 'weight') {
      setProfileForm(prev => ({
        ...prev,
        [name]: value ? parseFloat(value) : undefined
      }));
    } else {
      setProfileForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleVaccinationChange = (value: string) => {
    setProfileForm(prev => ({
      ...prev,
      vaccinationStatus: value
    }));
  };

  const renderHealthInfo = () => {
    const catProfile = catProfiles.find(p => p.id === selectedCatId);
    if (!catProfile || !sensorData) return null;

    return (
      <Card className="col-span-3 mb-4">
        <CardHeader>
          <CardTitle>Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Current Vitals</h3>
              <div className="space-y-1 text-muted-foreground">
                <p>Temperature: <span className="text-foreground">{selectedCatId && sensorData[selectedCatId]?.temperature}°C</span></p>
                <p>Activity: <span className="text-foreground">{selectedCatId && sensorData[selectedCatId]?.activity}</span></p>
                <p>Location: <span className="text-foreground">{selectedCatId && sensorData[selectedCatId]?.location}</span></p>
              </div>
            </div>
            <div> 
              <h3 className="font-semibold mb-2">Health Profile</h3>
              <div className="space-y-1 text-muted-foreground">
                {catProfile.weight && <p>Weight: <span className="text-foreground">{catProfile.weight} kg</span></p>}
                {catProfile.vaccinationStatus && (
                  <p>Vaccination Status: <span className="text-foreground">{catProfile.vaccinationStatus}</span></p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Medical Information</h3>
              <div className="space-y-1 text-muted-foreground">
                {catProfile.healthConditions && catProfile.healthConditions.length > 0 && (
                  <p>Health Conditions: <span className="text-foreground">{catProfile.healthConditions.join(', ')}</span></p>
                )}
                {catProfile.medications && catProfile.medications.length > 0 && (
                  <p>Medications: <span className="text-foreground">{catProfile.medications.join(', ')}</span></p>
                )}
                {catProfile.dietaryRestrictions && catProfile.dietaryRestrictions.length > 0 && (
                  <p>Dietary Restrictions: <span className="text-foreground">{catProfile.dietaryRestrictions.join(', ')}</span></p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      {catProfiles.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Your Cats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {catProfiles.map(profile => (
                <Button
                  key={profile.id}
                  variant={selectedCatId === profile.id ? "default" : "outline"}
                  onClick={() => setSelectedCatId(profile.id)}
                  className="flex-1"
                >
                  {profile.name}
                </Button>
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  setShowProfileForm(true);
                  setSelectedCatId(null);
                }}
                className="flex-1"
              >
                + Add New Cat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
  
      {!selectedCatId || showProfileForm ? (
        showProfileForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Create Cat Health Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={profileForm.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed">Breed</Label>
                    <Input
                      id="breed"
                      name="breed"
                      value={profileForm.breed}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
  
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years)</Label>
                    <Input
                      id="age"
                      type="number"
                      name="age"
                      value={profileForm.age || ''}
                      onChange={handleFormChange}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      name="weight"
                      value={profileForm.weight || ''}
                      onChange={handleFormChange}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="vaccination">Vaccination Status</Label>
                  <Select
                    value={profileForm.vaccinationStatus}
                    onValueChange={handleVaccinationChange}
                  >
                    <SelectTrigger id="vaccination">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Up to date">Up to date</SelectItem>
                      <SelectItem value="Partially vaccinated">Partially vaccinated</SelectItem>
                      <SelectItem value="Not vaccinated">Not vaccinated</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="healthConditions">Health Conditions</Label>
                  <Input
                    id="healthConditions"
                    name="healthConditions"
                    value={profileForm.healthConditions?.join(', ')}
                    onChange={handleFormChange}
                    placeholder="Separate conditions with commas"
                  />
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="medications">Medications</Label>
                  <Input
                    id="medications"
                    name="medications"
                    value={profileForm.medications?.join(', ')}
                    onChange={handleFormChange}
                    placeholder="Separate medications with commas"
                  />
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                  <Input
                    id="dietaryRestrictions"
                    name="dietaryRestrictions"
                    value={profileForm.dietaryRestrictions?.join(', ')}
                    onChange={handleFormChange}
                    placeholder="Separate restrictions with commas"
                  />
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="personality">Personality</Label>
                  <Input
                    id="personality"
                    name="personality"
                    value={profileForm.personality}
                    onChange={handleFormChange}
                    placeholder="e.g., playful, shy, curious"
                  />
                </div>
  
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={createProfile}
                  >
                    Create Profile
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowProfileForm(false);
                      if (catProfiles.length > 0) {
                        setSelectedCatId(catProfiles[0].id);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          !catProfiles.length && (
            <Button 
              className="w-full"
              onClick={() => setShowProfileForm(true)}
            >
              Create Your First Cat Profile
            </Button>
          )
        )
      ) : (
        <div className="space-y-4">
          {renderHealthInfo()}
          
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>{catProfiles.find(p => p.id === selectedCatId)?.name}'s Status</CardTitle>
              </CardHeader>
              <CardContent>
                {sensorData[selectedCatId] ? (
                  <div className="space-y-2 text-muted-foreground">
                    <p>Temperature: <span className="text-foreground">{sensorData[selectedCatId].temperature}°C</span></p>
                    <p>Activity: <span className="text-foreground">{sensorData[selectedCatId].activity}</span></p>
                    <p>Location: <span className="text-foreground">{sensorData[selectedCatId].location}</span></p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading sensor data...</p>
                )}
              </CardContent>
            </Card>
  
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Chat with {catProfiles.find(p => p.id === selectedCatId)?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-y-auto mb-4 space-y-2">
                  {selectedCatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 max-w-[80%] rounded-lg ${
                        msg.sender === 'user' 
                        ? "ml-auto bg-primary text-primary-foreground" 
                        : "mr-auto bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}