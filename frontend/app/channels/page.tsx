"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createChannel,
  updateChannel,
  deleteChannel,
  fetchChannels,
  fetchCurrentUser,
  testChannel,
  fetchAlertRules,
} from "@/lib/api";
import { NotificationChannel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, X, MessageSquare, Bell, Mail, Zap, Webhook, Send, Search, Filter } from "lucide-react";
import { formatDateOnly } from "@/lib/timezone";
import { Banner as BannerComponent, BannerKind } from "@/components/banner";

type ChannelType = "telegram" | "discord" | "slack" | "pagerduty" | "email" | "webhook";

const channelConfigs: Record<ChannelType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "email" | "url" | "password";
    placeholder: string;
    required: boolean;
    helpText?: string;
  }>;
}> = {
  telegram: {
    label: "Telegram",
    icon: Send,
    color: "text-primary",
    fields: [
      {
        name: "chat_id",
        label: "Chat ID",
        type: "text",
        placeholder: "123456789",
        required: true,
        helpText: "Get your chat ID from @userinfobot on Telegram"
      },
    ],
  },
  discord: {
    label: "Discord",
    icon: MessageSquare,
    color: "text-primary",
    fields: [
      {
        name: "webhook_url",
        label: "Webhook URL",
        type: "url",
        placeholder: "https://discord.com/api/webhooks/...",
        required: true,
        helpText: "Create a webhook in your Discord server settings"
      },
    ],
  },
  slack: {
    label: "Slack",
    icon: MessageSquare,
    color: "text-primary",
    fields: [
      {
        name: "webhook_url",
        label: "Webhook URL",
        type: "url",
        placeholder: "https://hooks.slack.com/services/...",
        required: true,
        helpText: "Create an incoming webhook in your Slack workspace"
      },
    ],
  },
  pagerduty: {
    label: "PagerDuty",
    icon: Bell,
    color: "text-primary",
    fields: [
      {
        name: "integration_key",
        label: "Integration Key",
        type: "password",
        placeholder: "Enter your PagerDuty integration key",
        required: true,
        helpText: "Find this in your PagerDuty service's integrations"
      },
    ],
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-primary",
    fields: [
      {
        name: "to_email",
        label: "Email Address",
        type: "email",
        placeholder: "alerts@example.com",
        required: true,
        helpText: "Email address to receive alert notifications"
      },
    ],
  },
  webhook: {
    label: "Webhook",
    icon: Webhook,
    color: "text-primary",
    fields: [
      {
        name: "url",
        label: "Webhook URL",
        type: "url",
        placeholder: "https://api.example.com/alerts",
        required: true,
        helpText: "Your custom webhook endpoint URL"
      },
      {
        name: "method",
        label: "HTTP Method",
        type: "text",
        placeholder: "POST",
        required: false,
        helpText: "HTTP method (default: POST)"
      },
    ],
  },
};

type Banner = { kind: BannerKind; message: string } | null;

export default function ChannelsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: channels = [],
    isLoading: channelsLoading,
  } = useQuery({ queryKey: ["channels"], queryFn: fetchChannels });

  const { data: alertRules = [] } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
    staleTime: 30_000,
  });

  const {
    data: currentUser,
    error: currentUserError,
  } = useQuery({ queryKey: ["current-user"], queryFn: fetchCurrentUser, retry: false });

  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [banner, setBanner] = useState<Banner>(null);
  const [globalBanner, setGlobalBanner] = useState<Banner>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!currentUserError) return;
    setGlobalBanner((prev) => {
      if (prev?.message === "Authentication expired. Please sign in again.") {
        return prev;
      }
      return { kind: "error", message: "Authentication expired. Please sign in again." };
    });
  }, [currentUserError]);

  const createChannelMutation = useMutation({
    mutationFn: createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      setBanner({ kind: "success", message: "Channel added successfully!" });
      setFormData({});
      setShowAddForm(false);
      setSelectedChannelType(null);
    },
    onError: (error: Error) =>
      setBanner({ kind: "error", message: error.message }),
  });

  const deleteChannelMutation = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      setBanner({ kind: "success", message: "Channel removed." });
    },
    onError: (error: Error) =>
      setBanner({ kind: "error", message: error.message }),
  });

  const testChannelMutation = useMutation({
    mutationFn: testChannel,
    onSuccess: ({ message }) =>
      setBanner({ kind: "success", message: message || "Test notification sent!" }),
    onError: (error: Error) =>
      setBanner({ kind: "error", message: error.message }),
  });

  const handleCreateChannel = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBanner(null);

    if (!selectedChannelType) {
      setBanner({ kind: "error", message: "Please select a channel type" });
      return;
    }

    const config = channelConfigs[selectedChannelType];
    const configData: Record<string, unknown> = {};

    // Validate and build config
    for (const field of config.fields) {
      const value = formData[field.name];
      if (field.required && !value) {
        setBanner({ kind: "error", message: `${field.label} is required` });
        return;
      }
      if (value) {
        configData[field.name] = value;
      }
    }

    createChannelMutation.mutate({
      channel_type: selectedChannelType,
      enabled: true,
      config: configData,
    });
  };

  const handleLogout = async () => {
    setGlobalBanner(null);
    try {
      await fetch("/api/session/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      setGlobalBanner({ kind: "error", message: "Failed to log out." });
      return;
    }
    router.push("/login");
    router.refresh();
  };

  const handleChannelTypeSelect = (type: ChannelType) => {
    setSelectedChannelType(type);
    setFormData({});
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-6 space-y-4 overflow-auto max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notification Channels</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure where you receive liquidation alerts
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Channel
          </Button>
        </div>

        {globalBanner && (
          <BannerComponent kind={globalBanner.kind} message={globalBanner.message} />
        )}

        {banner && (
          <BannerComponent kind={banner.kind} message={banner.message} />
        )}

        {/* Filters */}
        {!showAddForm && channels.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search channels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-32 text-xs h-8">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="pagerduty">PagerDuty</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-32 text-xs h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || typeFilter !== "all" || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                      setStatusFilter("all");
                    }}
                    className="h-8"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Form */}
        {showAddForm && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">Add Notification Channel</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedChannelType(null);
                    setFormData({});
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {!selectedChannelType ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(channelConfigs) as ChannelType[]).map((type) => {
                    const config = channelConfigs[type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => handleChannelTypeSelect(type)}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all text-left"
                      >
                        <Icon className={`h-6 w-6 ${config.color}`} />
                        <div>
                          <p className="text-sm font-medium">{config.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {config.fields.length} field{config.fields.length > 1 ? 's' : ''} required
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <form onSubmit={handleCreateChannel} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    {(() => {
                      const Icon = channelConfigs[selectedChannelType].icon;
                      return <Icon className={`h-5 w-5 ${channelConfigs[selectedChannelType].color}`} />;
                    })()}
                    <h3 className="text-sm font-medium">{channelConfigs[selectedChannelType].label}</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedChannelType(null)}
                      className="ml-auto text-xs"
                    >
                      Change
                    </Button>
                  </div>

                  {channelConfigs[selectedChannelType].fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <Label htmlFor={field.name} className="text-xs">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Input
                        id={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className="text-sm h-9"
                        required={field.required}
                      />
                      {field.helpText && (
                        <p className="text-xs text-muted-foreground">{field.helpText}</p>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedChannelType(null);
                        setFormData({});
                      }}
                    >
                      Back
                    </Button>
                    <Button type="submit" size="sm" disabled={createChannelMutation.isPending}>
                      {createChannelMutation.isPending ? "Adding..." : "Add Channel"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Channels List */}
        {channelsLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            Loading channels...
          </div>
        ) : channels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No notification channels yet</p>
              <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                Add your first notification channel to start receiving real-time liquidation alerts
              </p>
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Channel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {channels
              .filter((channel) => {
                // Type filter
                if (typeFilter !== "all" && channel.channel_type !== typeFilter) {
                  return false;
                }
                // Status filter
                if (statusFilter === "enabled" && !channel.enabled) {
                  return false;
                }
                if (statusFilter === "disabled" && channel.enabled) {
                  return false;
                }
                // Search filter
                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  const config = channel.config || {};
                  const searchableText = [
                    channel.channel_type,
                    config.chat_id,
                    config.to_email,
                    config.email,
                    config.webhook_url,
                    config.url,
                  ].filter(Boolean).join(" ").toLowerCase();

                  if (!searchableText.includes(query)) {
                    return false;
                  }
                }
                return true;
              })
              .map((channel) => {
              const config = channelConfigs[channel.channel_type as ChannelType];
              if (!config) return null;

              // Get active rules that use this channel (exclude archived)
              const rulesUsingChannel = alertRules.filter(rule =>
                !rule.archived && rule.channel_ids.includes(channel.id)
              );

              return (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  config={config}
                  onDelete={() => {
                    if (rulesUsingChannel.length > 0) {
                      setBanner({
                        kind: "error",
                        message: `Cannot delete: ${rulesUsingChannel.length} alert ${rulesUsingChannel.length === 1 ? 'rule' : 'rules'} depend on this channel. Please remove those rules first.`
                      });
                    } else {
                      deleteChannelMutation.mutate(channel.id);
                    }
                  }}
                  onTest={() => testChannelMutation.mutate(channel.id)}
                  isProcessing={deleteChannelMutation.isPending || testChannelMutation.isPending}
                  rulesUsingChannel={rulesUsingChannel}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

type ChannelCardProps = {
  channel: NotificationChannel;
  config: typeof channelConfigs[ChannelType];
  onDelete: () => void;
  onTest: () => void;
  isProcessing: boolean;
  rulesUsingChannel: any[];
};

function ChannelCard({ channel, config, onDelete, onTest, isProcessing, rulesUsingChannel }: ChannelCardProps) {
  const router = useRouter();
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="p-4 flex flex-col h-full">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <div>
              <p className="text-sm font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateOnly(channel.updated_at)}
              </p>
            </div>
          </div>

          <div className="rounded bg-muted/30 p-2 border border-border">
            <div className="space-y-1">
              {Object.entries(channel.config).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-xs font-mono truncate ml-2 max-w-[150px]">
                    {key.includes('key') || key.includes('token') || key.includes('password')
                      ? '••••••••'
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Display rules using this channel */}
          {rulesUsingChannel.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">
                Alert Rules ({rulesUsingChannel.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rulesUsingChannel.map((rule) => (
                  <Badge
                    key={rule.id}
                    variant={
                      rule.alert_severity === "critical"
                        ? "destructive"
                        : rule.alert_severity === "warning"
                        ? "warning"
                        : "default"
                    }
                    className="text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => router.push("/alert-rules")}
                  >
                    {rule.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={onTest}
            disabled={isProcessing}
            className="flex-1"
          >
            Test
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            disabled={isProcessing}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
