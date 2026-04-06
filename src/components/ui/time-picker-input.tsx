import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerInputProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export function TimePickerInput({ value, onChange, placeholder = "Select time", disabled, className }: TimePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState(() => value?.split(":")[0] || "");
  const [selectedMinute, setSelectedMinute] = React.useState(() => value?.split(":")[1] || "");

  React.useEffect(() => {
    if (value) {
      const parts = value.split(":");
      setSelectedHour(parts[0] || "");
      setSelectedMinute(parts[1] || "");
    }
  }, [value]);

  const handleHourClick = (hour: string) => {
    setSelectedHour(hour);
    const min = selectedMinute || "00";
    onChange(`${hour}:${min}`);
  };

  const handleMinuteClick = (minute: string) => {
    setSelectedMinute(minute);
    const hr = selectedHour || "12";
    onChange(`${hr}:${minute}`);
    setOpen(false);
  };

  const displayValue = value ? value : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0 opacity-60" />
          {displayValue || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 pointer-events-auto" align="start">
        <div className="flex">
          {/* Hours */}
          <div className="flex-1 border-r border-border/40">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center bg-muted/40">
              Hour
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1 space-y-0.5">
                {HOURS.map(hour => (
                  <button
                    key={hour}
                    onClick={() => handleHourClick(hour)}
                    className={cn(
                      "w-full text-center text-sm py-1.5 rounded-md transition-colors",
                      selectedHour === hour
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          {/* Minutes */}
          <div className="flex-1">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center bg-muted/40">
              Min
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1 space-y-0.5">
                {MINUTES.map(minute => (
                  <button
                    key={minute}
                    onClick={() => handleMinuteClick(minute)}
                    className={cn(
                      "w-full text-center text-sm py-1.5 rounded-md transition-colors",
                      selectedMinute === minute && selectedHour
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
