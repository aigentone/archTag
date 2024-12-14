// src/app/archietag/page.tsx
import { DocumentSection } from "@/components/shared/document-section"

export default function ArchieTagPage() {
  return (
    <div className="container py-6 lg:py-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">ArchieTag</h1>
      
      <div className="space-y-6">
        <DocumentSection 
          title="Abstract"
          content="ArchieTag is an innovative pet monitoring system that combines advanced sensor technology with artificial intelligence to provide comprehensive health and behavioral tracking for cats. The system features a smart collar equipped with non-contact sensors and is supported by AI agents that learn and adapt to each cat's unique personality and patterns, offering pet owners unprecedented insights into their feline companions' wellbeing. In the app user can directly chat with their cat agent, which will be crated by users define characters, and feeding with sensors data, it can directly understand behaviour and share it with the user."
        />

        <DocumentSection 
          title="Introduction"
          content={[
            "In today's connected world, pet owners increasingly seek ways to better understand and care for their animal companions. Traditional pet care relies heavily on periodic veterinary visits and owner observation, potentially missing subtle changes in health and behavior.",
            "ArchieTag addresses this gap by providing continuous, non-invasive monitoring through a sophisticated yet comfortable smart collar system. The solution combines hardware sensors with artificial intelligence to create a comprehensive pet health monitoring platform.",
            "The system's unique approach focuses on cat-specific behaviors and patterns, utilizing AI agents that learn and adapt to each cat's individual characteristics."
          ]}
        />

        <DocumentSection 
          title="Technical Innovation"
          content={[
            'Smart Collar Technology:',
            '• Multi-point infrared temperature sensing without requiring direct skin contact',
            '• Precision accelerometers for detailed movement and position tracking',
            '• Advanced audio processing for vocalization pattern analysis',
            '• Optimized battery life of 5-7 days with intelligent power management',
            
            'AI Agent System:',
            '• Personalized behavioral modeling for each cat',
            '• Pattern recognition for activity, rest, and social interactions',
            '• Continuous learning and adaptation to individual cat characteristics',
            '• Real-time health and wellness monitoring with predictive capabilities'
          ]}
        />
        <DocumentSection
        title="Key Features"
        content={[
            'Personalized Cat Profiles:',
            '• Detailed personality trait mapping',
            '• Individual baseline establishment',
            '• Adaptive threshold adjustment',
            '• Historical pattern analysis',

            'Health Monitoring:',
            '• Non-invasive temperature tracking',
            '• Activity level assessment',
                    '• Sleep pattern analysis',
                    '• Behavioral change detection'
                ]}
        />
        <DocumentSection
        title="Implementation Approach"
        content={[
            'Phase 1: Core System Development',
            '• Basic sensor integration and testing',
            '• Development of foundational AI models',
            '• User interface prototyping',

            'Phase 2: AI Enhancement',
            '• Implementation of learning algorithms',
            '• Personality profile system development',
            '• Pattern recognition refinement',

            'Phase 3: User Testing and Refinement',
            '• Beta testing with diverse cat populations',
            '• System optimization based on user feedback',
            '• Performance and accuracy validation'
        ]}
        />
        <DocumentSection
        title="Expected Impact"
        content={[
            'For Pet Owners:',
            '• Early detection of health issues',
            '• Better understanding of pet behavior',
            '• Reduced veterinary costs through preventive care',
            '• Peace of mind through continuous monitoring',

            'For Veterinary Care:',
            '• More detailed patient history',
            '• Data-driven treatment decisions',
            '• Improved monitoring of treatment effectiveness'
        ]}
        />

        <DocumentSection
        title="Future Development"
        content={[
            'The ArchieTag system is designed for continuous evolution and improvement:',
            '• Integration with veterinary systems',
            '• Expansion to support multiple pet species',
            '• Advanced AI model development',
            '• Enhanced sensor capabilities',
            '• Community features for pet owners'
        ]}
        />

      </div>
    </div>
  )
}

