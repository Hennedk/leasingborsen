import React from 'react'
import BaseLayout from '@/components/BaseLayout'

const About: React.FC = () => {
  return (
    <BaseLayout>
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Om Os</h1>
          <p className="text-muted-foreground">About page coming soon...</p>
        </div>
      </div>
    </BaseLayout>
  )
}

export default About