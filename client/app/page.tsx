
export default function Home() {
  return (
    <main className="container py-6 lg:py-10">
      <div className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to ArchieTag</h1>
        <p className="text-xl text-muted-foreground max-w-[600px]">
          Monitor your pet's health, track their activities, and chat with them through our AI-powered platform.
        </p>
        <div className="grid gap-4 mt-6">
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-2xl font-semibold mb-2">Real-time Monitoring</h2>
            <p className="text-muted-foreground">
              Keep track of your pet's vital signs, location, and activities in real-time.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-2xl font-semibold mb-2">AI Interaction</h2>
            <p className="text-muted-foreground">
              Chat with an AI representation of your pet, trained on their unique personality and behavior patterns.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}