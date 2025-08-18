import React from 'react'
import SearchForm from './SearchForm'
import './HeroBanner.css'

const HeroBanner: React.FC = () => {

  return (
    /* =================================================
       HERO BANNER SECTION - Main container wrapper
       Full width on mobile, rounded container on desktop
    ================================================= */
    <section className="w-full px-0 md:px-6 lg:px-12">
      <div className="w-full md:mx-auto md:max-w-[1440px]">
        <div className="relative overflow-hidden w-full bg-gradient-to-r from-[#D8400D] via-[#C43A0D] to-[#B2330B] md:rounded-3xl">
          {/* =================
              CONTENT CONTAINER - Main content wrapper with padding
          ================= */}
          <div className="w-full">
            <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12 py-8 md:py-16 relative z-10">
          
          {/* =================
              CONTENT LAYOUT - Left aligned with homepage sections
              Search form and headers aligned with other content
          ================= */}
          <div className="w-full">
            
            {/* =========================================
                HEADLINE AND SEARCH FORM SECTION
                - Left aligned with other homepage content
                - Consistent with max-width and padding
            ========================================= */}
            <div className="animate-slide-in-left max-w-2xl">
              {/* Main Headline & Description - Outside search form */}
              <div className="space-y-3 mb-8">
                {/* Primary Headline - 38px */}
                <h1 className="font-bold text-white leading-[1.1] tracking-tight" style={{fontSize: '38px', fontWeight: 800}}>
                  Din buddy i leasingjunglen
                </h1>
                
                {/* Descriptive Subtitle - 16px */}
                <p className="text-white/90 leading-relaxed" style={{fontSize: '16px'}}>
                  Få overblik over de bedste privatleasingtilbud og find det tilbud, der passer perfekt til dine behov.
                </p>
              </div>
              
              {/* Search Form */}
              <SearchForm 
                className="w-full max-w-lg" 
                size="default"
              />
            </div>
            
          </div>
        </div>
      </div>
      </div>
    </div>

    </section>
  )
}

export default HeroBanner