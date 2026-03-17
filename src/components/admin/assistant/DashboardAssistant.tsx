import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useHotel } from '@/hooks/useHotel';
import { assistantActions } from './actions';
import { executeAction } from './queries';
import { AssistantMessage, AssistantState, ReservationResult, AvailabilityResult } from './types';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface DashboardAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DashboardAssistant({ open, onOpenChange }: DashboardAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: 'welcome', role: 'assistant', content: 'Hello! How can I help you today?' },
  ]);
  const [state, setState] = useState<AssistantState>({ step: 'idle', actionId: null, collectedInput: {} });
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [singleDate, setSingleDate] = useState<Date | undefined>();
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([]);
  const { hotel } = useHotel();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  useEffect(() => {
    supabase.from('room_types').select('id, name').then(({ data }) => {
      if (data) setRoomTypes(data);
    });
  }, []);

  const addMsg = useCallback((role: 'assistant' | 'user', content: string, extra?: Partial<AssistantMessage>) => {
    setMessages(prev => [...prev, { id: uid(), role, content, ...extra }]);
  }, []);

  const reset = useCallback(() => {
    setState({ step: 'idle', actionId: null, collectedInput: {} });
    setTextInput('');
    setDateRange({});
    setSingleDate(undefined);
  }, []);

  const runAction = useCallback(async (actionId: string, input: Record<string, string>) => {
    setLoading(true);
    try {
      const result = await executeAction(actionId, input, hotel?.id);
      addMsg('assistant', result.message, {
        results: result.results,
        availabilityResults: result.availabilityResults,
      });
    } catch {
      addMsg('assistant', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      reset();
    }
  }, [hotel?.id, addMsg, reset]);

  const handleActionClick = useCallback((actionId: string) => {
    const action = assistantActions.find(a => a.id === actionId);
    if (!action) return;
    addMsg('user', action.label);
    if (action.steps.length === 0) {
      runAction(actionId, {});
    } else {
      const step = action.steps[0];
      addMsg('assistant', step.prompt);
      setState({ step: step.type, actionId, collectedInput: {} });
    }
  }, [addMsg, runAction]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || !state.actionId) return;
    const action = assistantActions.find(a => a.id === state.actionId);
    if (!action) return;
    const step = action.steps[0];
    addMsg('user', textInput);
    runAction(state.actionId, { ...state.collectedInput, [step.inputKey!]: textInput.trim() });
    setTextInput('');
  }, [textInput, state, addMsg, runAction]);

  const handleDateRangeSubmit = useCallback(() => {
    if (!dateRange.from || !dateRange.to || !state.actionId) return;
    const action = assistantActions.find(a => a.id === state.actionId);
    if (!action) return;
    const step = action.steps[0];
    const from = format(dateRange.from, 'yyyy-MM-dd');
    const to = format(dateRange.to, 'yyyy-MM-dd');
    addMsg('user', `${from} → ${to}`);
    runAction(state.actionId, { ...state.collectedInput, [step.inputKey!]: `${from}|${to}` });
    setDateRange({});
  }, [dateRange, state, addMsg, runAction]);

  const handleSingleDateSubmit = useCallback(() => {
    if (!singleDate || !state.actionId) return;
    const action = assistantActions.find(a => a.id === state.actionId);
    if (!action) return;
    const step = action.steps[0];
    const d = format(singleDate, 'yyyy-MM-dd');
    addMsg('user', d);
    runAction(state.actionId, { ...state.collectedInput, [step.inputKey!]: d });
    setSingleDate(undefined);
  }, [singleDate, state, addMsg, runAction]);

  const handleRoomTypeSelect = useCallback((roomTypeId: string) => {
    if (!state.actionId) return;
    const action = assistantActions.find(a => a.id === state.actionId);
    if (!action) return;
    const step = action.steps[0];
    const rt = roomTypes.find(r => r.id === roomTypeId);
    addMsg('user', rt?.name || roomTypeId);
    runAction(state.actionId, { ...state.collectedInput, [step.inputKey!]: roomTypeId });
  }, [state, roomTypes, addMsg, runAction]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle size={16} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Dashboard Assistant</DialogTitle>
              <p className="text-xs text-muted-foreground">Select a question below</p>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 400, minHeight: 200 }}>
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}
              >
                <p>{msg.content}</p>
                {msg.results && msg.results.length > 0 && <ResultsTable results={msg.results} />}
                {msg.availabilityResults && msg.availabilityResults.length > 0 && <AvailabilityTable results={msg.availabilityResults} />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-3.5 py-2.5 rounded-bl-sm">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 space-y-2">
          {state.step === 'idle' && (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {assistantActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm bg-secondary/50 hover:bg-secondary text-foreground transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {state.step === 'awaiting-text' && (
            <div className="flex gap-2">
              <button onClick={() => { addMsg('user', 'Cancel'); reset(); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                <ArrowLeft size={16} />
              </button>
              <Input
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                placeholder={assistantActions.find(a => a.id === state.actionId)?.steps[0]?.placeholder}
                className="flex-1 h-9 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleTextSubmit} disabled={!textInput.trim()} className="h-9 px-3">
                <Send size={14} />
              </Button>
            </div>
          )}

          {state.step === 'awaiting-dates' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => { addMsg('user', 'Cancel'); reset(); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  <ArrowLeft size={16} />
                </button>
                <span className="text-xs text-muted-foreground">
                  {dateRange.from ? format(dateRange.from, 'MMM d') : 'From'} → {dateRange.to ? format(dateRange.to, 'MMM d') : 'To'}
                </span>
                <Button size="sm" onClick={handleDateRangeSubmit} disabled={!dateRange.from || !dateRange.to} className="h-8 px-3 ml-auto text-xs">
                  Submit
                </Button>
              </div>
              <Calendar
                mode="range"
                selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                className="p-2 pointer-events-auto rounded-lg border border-border"
                numberOfMonths={1}
              />
            </div>
          )}

          {state.step === 'awaiting-date' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => { addMsg('user', 'Cancel'); reset(); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  <ArrowLeft size={16} />
                </button>
                <span className="text-xs text-muted-foreground">
                  {singleDate ? format(singleDate, 'MMM d, yyyy') : 'Select a date'}
                </span>
                <Button size="sm" onClick={handleSingleDateSubmit} disabled={!singleDate} className="h-8 px-3 ml-auto text-xs">
                  Submit
                </Button>
              </div>
              <Calendar
                mode="single"
                selected={singleDate}
                onSelect={setSingleDate}
                className="p-2 pointer-events-auto rounded-lg border border-border"
              />
            </div>
          )}

          {state.step === 'awaiting-room-type' && (
            <div className="flex gap-2 items-center">
              <button onClick={() => { addMsg('user', 'Cancel'); reset(); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                <ArrowLeft size={16} />
              </button>
              <Select onValueChange={handleRoomTypeSelect}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="Select room type..." />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map(rt => (
                    <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultsTable({ results }: { results: ReservationResult[] }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-background/50">
            <th className="text-left px-2 py-1.5 font-medium">Guest</th>
            <th className="text-left px-2 py-1.5 font-medium">Room</th>
            <th className="text-left px-2 py-1.5 font-medium">Check-in</th>
            <th className="text-left px-2 py-1.5 font-medium">Check-out</th>
            <th className="text-left px-2 py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {results.slice(0, 20).map(r => (
            <tr key={r.id} className="border-t border-border/30">
              <td className="px-2 py-1.5 whitespace-nowrap">{r.guest_name}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.room_type_name}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.check_in}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.check_out}</td>
              <td className="px-2 py-1.5">
                <span className={cn(
                  'inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize',
                  r.status === 'confirmed' && 'bg-green-500/20 text-green-400',
                  r.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                  r.status === 'cancelled' && 'bg-red-500/20 text-red-400',
                  r.status === 'completed' && 'bg-blue-500/20 text-blue-400',
                )}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {results.length > 20 && (
        <p className="text-[10px] text-muted-foreground px-2 py-1">Showing 20 of {results.length} results</p>
      )}
    </div>
  );
}

function AvailabilityTable({ results }: { results: AvailabilityResult[] }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-background/50">
            <th className="text-left px-2 py-1.5 font-medium">Room Type</th>
            <th className="text-center px-2 py-1.5 font-medium">Total</th>
            <th className="text-center px-2 py-1.5 font-medium">Booked</th>
            <th className="text-center px-2 py-1.5 font-medium">Free</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.room_type_id} className="border-t border-border/30">
              <td className="px-2 py-1.5">{r.name}</td>
              <td className="px-2 py-1.5 text-center">{r.available_units}</td>
              <td className="px-2 py-1.5 text-center">{r.booked_units}</td>
              <td className={cn('px-2 py-1.5 text-center font-medium', r.free_units > 0 ? 'text-green-400' : 'text-red-400')}>
                {r.free_units}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}