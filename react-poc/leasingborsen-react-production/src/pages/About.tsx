import React from 'react'
import BaseLayout from '@/components/BaseLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Target, 
  Award, 
  Shield, 
  Heart,
  Car,
  TrendingUp,
  Clock
} from 'lucide-react'

const About: React.FC = () => {
  const values = [
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Troværdighed",
      description: "Vi arbejder kun sammen med verificerede forhandlere og sikrer gennemsigtighed i alle vores leasingtilbud."
    },
    {
      icon: <Heart className="h-8 w-8 text-primary" />,
      title: "Kundefokus",
      description: "Vores kunder står i centrum. Vi stræber efter at gøre leasingprocessen så nem og overskuelig som muligt."
    },
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Innovation",
      description: "Vi udvikler konstant vores platform for at tilbyde de bedste værktøjer til sammenligning af leasingtilbud."
    },
    {
      icon: <Award className="h-8 w-8 text-primary" />,
      title: "Kvalitet",
      description: "Vi sætter høje standarder for både vores platform og de forhandlere, vi samarbejder med."
    }
  ]

  const stats = [
    { number: "2019", label: "Grundlagt" },
    { number: "50+", label: "Partnere" },
    { number: "25.000+", label: "Månedlige brugere" },
    { number: "500+", label: "Aktive annoncer" }
  ]

  const team = [
    {
      name: "Lars Nielsen",
      role: "CEO & Grundlægger",
      description: "Med over 15 års erfaring i bilindustrien grundlagde Lars Leasingbørsen for at skabe gennemsigtighed i leasingmarkedet."
    },
    {
      name: "Maria Hansen",
      role: "CTO",
      description: "Maria leder vores tekniske udvikling og sikrer, at platformen altid er opdateret med de nyeste funktioner."
    },
    {
      name: "Anders Sørensen",
      role: "Sales Director",
      description: "Anders bygger broer mellem forhandlere og kunder og sikrer, at alle får den bedste oplevelse."
    }
  ]

  return (
    <BaseLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 py-16 md:py-24 relative z-10">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Om Leasingbørsen
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Vi forenkler billeasing
            </h1>
            <p className="text-xl text-white/85 leading-relaxed max-w-2xl mx-auto">
              Siden 2019 har vi hjulpet tusindvis af danskere med at finde de bedste leasingtilbud. 
              Vores mission er at skabe gennemsigtighed og tilgængelighed i leasingmarkedet.
            </p>
            <Link to="/listings">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
                <Car className="mr-2 h-5 w-5" />
                Se vores biler
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="space-y-16 py-16">
        
        {/* Mission Section */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div>
                  <Badge variant="outline" className="mb-4">
                    Vores mission
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Hvorfor vi startede Leasingbørsen
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Vi opdagede, at det var alt for besværligt at sammenligne leasingtilbud fra forskellige forhandlere. 
                    Mange forbrugere brugte timer på at ringe rundt til forhandlere for at få tilbud.
                  </p>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Derfor skabte vi Leasingbørsen - en platform hvor du nemt kan sammenligne tilbud, læse om forskellige bilmodeller 
                  og få indsigt i leasingvilkår. Alt på ét sted.
                </p>

                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Konstant vækst</div>
                    <div className="text-muted-foreground">Vi hjælper flere kunder hver måned</div>
                  </div>
                </div>
              </div>

              <Card className="border border-border">
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <Clock className="h-12 w-12 text-primary mx-auto" />
                    <h3 className="text-2xl font-bold text-foreground">
                      Spar tid og penge
                    </h3>
                    <p className="text-muted-foreground">
                      I stedet for at bruge timer på at kontakte forskellige forhandlere, 
                      kan du sammenligne tilbud på få minutter.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-1">5 min</div>
                      <div className="text-sm text-muted-foreground">
                        Gennemsnitlig tid til at finde det rette tilbud
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="bg-muted/30">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Vores værdier
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Disse principper guider alt, hvad vi gør, og sikrer, at vi altid leverer den bedste service til vores kunder.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="border border-border transition-all">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        {value.icon}
                        <h3 className="text-xl font-semibold text-foreground">
                          {value.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Mød teamet
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Vores dedikerede team arbejder hver dag for at forbedre jeres leasingoplevelse.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <Card key={index} className="border border-border text-center">
                  <CardHeader>
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground">
                      {member.name}
                    </CardTitle>
                    <Badge variant="secondary" className="mx-auto">
                      {member.role}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {member.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Klar til at finde din næste bil?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Udforsk vores store udvalg af leasingbiler og oplev selv, hvorfor tusindvis af danskere 
                  stoler på Leasingbørsen.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/listings">
                    <Button size="lg" className="font-semibold w-full sm:w-auto">
                      <Car className="mr-2 h-5 w-5" />
                      Se alle biler
                    </Button>
                  </Link>
                  <Link to="/why-private-leasing">
                    <Button variant="outline" size="lg" className="font-semibold w-full sm:w-auto">
                      Lær om privatleasing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </BaseLayout>
  )
}

export default About