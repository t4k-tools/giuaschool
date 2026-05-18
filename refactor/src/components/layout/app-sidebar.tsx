"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { api, type MenuItem } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  GraduationCap,
  Home,
  Settings,
  School,
  UserCheck,
  Users,
  Baby,
  ChevronUp,
  LogOut,
  User,
  ChevronRight,
  Undo2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Mappa icone dal database al componente Lucide
const iconMap: Record<string, React.ElementType> = {
  cog: Settings,
  school: School,
  "user-tie": UserCheck,
  "user-graduate": Users,
  child: Baby,
};

function decodeHtml(html: string): string {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&agrave;/g, "à")
    .replace(/&egrave;/g, "è")
    .replace(/&igrave;/g, "ì")
    .replace(/&ograve;/g, "ò")
    .replace(/&ugrave;/g, "ù")
    .replace(/&amp;/g, "&");
}

function legacyRouteToHref(route: string): string {
  const mappedRoutes: Record<string, string> = {
    login_home: "/dashboard",
    lezioni_registro_firme: "/registro/firme",
    lezioni_assenze_quadro: "/registro/assenze",
    lezioni_voti_quadro: "/registro/voti",
    lezioni_note: "/registro/note",
    circolari_bacheca: "/circolari",
    avvisi_bacheca: "/avvisi",
    avvisi_agenda: "/agenda",
    colloqui_genitori: "/colloqui",
    colloqui_richieste: "/colloqui",
    colloqui_storico: "/colloqui",
    colloqui_cerca: "/colloqui",
    colloqui_gestione: "/colloqui",
    colloqui_edit: "/colloqui",
    colloqui_create: "/colloqui",
    colloqui_delete: "/colloqui",
    colloqui_enable: "/colloqui",
    genitori_lezioni: "/famiglia?tab=lezioni",
    genitori_argomenti: "/famiglia?tab=lezioni",
    genitori_voti: "/famiglia?tab=voti",
    genitori_assenze: "/famiglia?tab=assenze",
    genitori_note: "/famiglia?tab=note",
    genitori_osservazioni: "/famiglia?tab=osservazioni",
    genitori_pagelle: "/pagelle",
    richieste_lista: "/richieste",
    richieste_add: "/richieste",
    richieste_delete: "/richieste",
  };

  return mappedRoutes[route] || `/${route.replace(/_/g, "/")}`;
}

export function AppSidebar() {
  const { user, token, logout, isAliasing, originalUser, exitAlias } = useAuth();
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (token) {
      api.menu
        .list(token)
        .then((data) => setMenuItems(data.menu))
        .catch(() => {});
    }
  }, [token]);

  const initials = user
    ? `${user.nome.charAt(0)}${user.cognome.charAt(0)}`
    : "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Registro</span>
                  <span className="text-xs opacity-70">ACIIEF</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigazione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item, i) => {
                const IconComponent = item.icona
                  ? iconMap[item.icona] || Settings
                  : Home;
                const itemName = decodeHtml(item.nome);

                if (item.sottoMenu && item.sottoMenu.length > 0) {
                  return (
                    <Collapsible key={i} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={itemName}>
                            <IconComponent className="size-4" />
                            <span>{itemName}</span>
                            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.sottoMenu.map((sub, j) => (
                              <SidebarMenuSubItem key={j}>
                                <SidebarMenuSubButton asChild>
                                  <Link href={legacyRouteToHref(sub.url)}>
                                    <span>{decodeHtml(sub.nome)}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuButton tooltip={itemName} asChild>
                      <Link href={legacyRouteToHref(item.url)}>
                        <IconComponent className="size-4" />
                        <span>{itemName}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sm">
                      {user?.nome} {user?.cognome}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-70">
                        {user?.ruoloLabel}
                      </span>
                      {isAliasing && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          Alias
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={() => router.push("/profilo")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profilo</span>
                </DropdownMenuItem>
                {isAliasing && (
                  <DropdownMenuItem onClick={() => void exitAlias()}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    <span>
                      Esci alias
                      {originalUser ? ` (${originalUser.username})` : ""}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Esci</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
