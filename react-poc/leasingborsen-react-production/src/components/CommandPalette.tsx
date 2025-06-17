import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Car,
  Users,
  Settings,
  Plus,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandAction {
  id: string
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  keywords?: string[]
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const commands: CommandAction[] = [
    // Navigation
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Gå til dashboard',
      icon: LayoutDashboard,
      action: () => {
        navigate('/admin')
        onOpenChange(false)
      },
      keywords: ['dashboard', 'hjem', 'oversigt'],
    },
    {
      id: 'listings',
      title: 'Annoncer',
      description: 'Se alle annoncer',
      icon: Car,
      action: () => {
        navigate('/admin/listings')
        onOpenChange(false)
      },
      keywords: ['annoncer', 'biler', 'listings'],
    },
    {
      id: 'sellers',
      title: 'Sælgere',
      description: 'Administrer sælgere',
      icon: Users,
      action: () => {
        navigate('/admin/sellers')
        onOpenChange(false)
      },
      keywords: ['sælgere', 'brugere', 'sellers'],
    },
    {
      id: 'settings',
      title: 'Indstillinger',
      description: 'Systemindstillinger',
      icon: Settings,
      action: () => {
        navigate('/admin/settings')
        onOpenChange(false)
      },
      keywords: ['indstillinger', 'settings', 'konfiguration'],
    },

    // Actions
    {
      id: 'create-listing',
      title: 'Opret ny annonce',
      description: 'Tilføj en ny bil til platformen',
      icon: Plus,
      action: () => {
        navigate('/admin/listings/create')
        onOpenChange(false)
      },
      keywords: ['opret', 'ny', 'annonce', 'bil', 'create'],
    },
    {
      id: 'create-seller',
      title: 'Opret ny sælger',
      description: 'Tilføj en ny sælger',
      icon: Plus,
      action: () => {
        navigate('/admin/sellers/create')
        onOpenChange(false)
      },
      keywords: ['opret', 'ny', 'sælger', 'bruger', 'create'],
    },
  ]

  const runCommand = (command: CommandAction) => {
    command.action()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Søg efter kommandoer..." />
      <CommandList>
        <CommandEmpty>Ingen resultater fundet.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {commands
            .filter(cmd => ['dashboard', 'listings', 'sellers', 'settings'].includes(cmd.id))
            .map((command) => (
              <CommandItem
                key={command.id}
                value={`${command.title} ${command.keywords?.join(' ') || ''}`}
                onSelect={() => runCommand(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{command.title}</span>
                  {command.description && (
                    <span className="text-xs text-muted-foreground">
                      {command.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Handlinger">
          {commands
            .filter(cmd => cmd.id.startsWith('create-'))
            .map((command) => (
              <CommandItem
                key={command.id}
                value={`${command.title} ${command.keywords?.join(' ') || ''}`}
                onSelect={() => runCommand(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{command.title}</span>
                  {command.description && (
                    <span className="text-xs text-muted-foreground">
                      {command.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}