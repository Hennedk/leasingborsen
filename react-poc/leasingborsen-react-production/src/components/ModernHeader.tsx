import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Car } from 'lucide-react'
import Container from '@/components/Container'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'

const ModernHeader: React.FC = () => {
  const location = useLocation()

  const isActiveLink = (path: string) => location.pathname === path

  const menuItems = [
    { 
      title: 'Hjem', 
      url: '/',
      description: 'Gå til forsiden'
    },
    {
      title: 'Hvorfor privatleasing',
      url: '/why-private-leasing',
      description: 'Fordele ved privatleasing'
    },
    {
      title: 'Om os',
      url: '/about',
      description: 'Læs om Leasingbørsen'
    },
    {
      title: 'Annoncering',
      url: '/advertising',
      description: 'Annoncér på Leasingbørsen'
    }
  ]

  const renderMenuItem = (item: any) => {
    if (item.items) {
      return (
        <NavigationMenuItem key={item.title}>
          <NavigationMenuTrigger className="bg-transparent hover:bg-accent hover:text-accent-foreground">
            {item.title}
          </NavigationMenuTrigger>
          <NavigationMenuContent className="bg-popover text-popover-foreground">
            <div className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <div className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                    to={item.url}
                  >
                    <Car className="h-6 w-6" />
                    <div className="mb-2 mt-4 text-lg font-medium">
                      {item.title}
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Udforsk vores udvalg af kvalitetsbiler
                    </p>
                  </Link>
                </NavigationMenuLink>
              </div>
              <div className="grid gap-1">
                {item.items.map((subItem: any) => (
                  <NavigationMenuLink asChild key={subItem.title}>
                    <Link
                      to={subItem.url}
                      className="flex items-center gap-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <div className="text-foreground">{subItem.icon}</div>
                      <div>
                        <div className="text-sm font-medium leading-none">{subItem.title}</div>
                        {subItem.description && (
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                            {subItem.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  </NavigationMenuLink>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      )
    }

    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuLink asChild>
          <Link
            to={item.url}
            className={`text-sm font-medium transition-colors hover:text-primary focus:text-primary focus:outline-none ${
              isActiveLink(item.url) ? 'text-primary' : 'text-foreground'
            }`}
          >
            {item.title}
          </Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
    )
  }

  const renderMobileMenuItem = (item: any) => {
    if (item.items) {
      return (
        <AccordionItem key={item.title} value={item.title} className="border-b-0">
          <AccordionTrigger className="text-base py-0 font-medium hover:no-underline">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="mt-2">
            <div className="flex flex-col gap-2">
              {item.items.map((subItem: any) => (
                <Link
                  key={subItem.title}
                  to={subItem.url}
                  className="flex items-center gap-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="text-foreground">{subItem.icon}</div>
                  <div>
                    <div className="text-sm font-medium leading-none">{subItem.title}</div>
                    {subItem.description && (
                      <p className="text-sm leading-snug text-muted-foreground mt-1">
                        {subItem.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )
    }

    return (
      <Link 
        key={item.title} 
        to={item.url} 
        className={`text-base font-medium py-2 ${
          isActiveLink(item.url) ? 'text-primary' : 'text-foreground hover:text-primary'
        }`}
      >
        {item.title}
      </Link>
    )
  }

  return (
    <header className="lg:sticky top-0 z-50 w-full border-b border-border/50 bg-card">
      <Container className="flex h-16 items-center justify-between">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 flex-1">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">Leasingbørsen</span>
          </Link>

          {/* Navigation Menu */}
          <NavigationMenu>
            <NavigationMenuList>
              {menuItems.map((item) => renderMenuItem(item))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Admin Link */}
        <div className="hidden md:flex">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">Admin</Link>
          </Button>
        </div>


        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center justify-between w-full">
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-primary">Leasingbørsen</span>
          </Link>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Link to="/" className="flex items-center space-x-2">
                    <Car className="h-6 w-6 text-primary" />
                    <span className="text-lg font-bold text-primary">Leasingbørsen</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 py-6">
                <Accordion
                  type="single"
                  collapsible
                  className="flex w-full flex-col"
                >
                  {menuItems.map((item) => renderMobileMenuItem(item))}
                </Accordion>
                
                {/* Mobile Admin Link */}
                <div className="border-t pt-4">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/admin">Admin</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}

export default ModernHeader