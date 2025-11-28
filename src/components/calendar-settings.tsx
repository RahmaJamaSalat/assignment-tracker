"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Link2, Unlink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CalendarSettings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch("/api/google-calendar/status");
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
      }
    } catch (error) {
      console.error("Failed to check calendar status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/google-calendar/auth");
      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth page
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "Error",
          description: "Failed to initiate calendar connection",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to connect calendar:", error);
      toast({
        title: "Error",
        description: "Failed to connect calendar",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
      });
      
      if (response.ok) {
        setIsConnected(false);
        toast({
          title: "Success",
          description: "Google Calendar disconnected successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to disconnect calendar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to disconnect calendar:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect calendar",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-1">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </h3>
        <p className="text-sm text-muted-foreground">
          Automatically sync your assignments to Google Calendar
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Connection Status</p>
          <p className="text-sm text-muted-foreground">
            {isConnected ? "Connected to Google Calendar" : "Not connected"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-2 text-sm text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-600" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleDisconnect}
            disabled={isConnecting}
            variant="destructive"
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect Calendar
              </>
            )}
          </Button>
        )}
      </div>

      {isConnected && (
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>New assignments are automatically added to your calendar</li>
                <li>Updates to assignments sync to calendar events</li>
                <li>Deleted assignments remove the calendar event</li>
                <li>Events are created 1 hour before the due date</li>
                <li>Reminders set for 1 day and 1 hour before due date</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
