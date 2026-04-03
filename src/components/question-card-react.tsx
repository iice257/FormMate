import { categorizeField } from '@/ai/field-classifier';
import { canRedo, canUndo, redoAnswer, undoAnswer, updateAnswer } from '@/state';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function Icon({ name }) {
  return <span className="material-symbols-outlined leading-none">{name}</span>;
}

export function QuestionCard({ question, index, answer, onRegenerate, onQuickEdit }) {
  const answerText = answer?.text || '';
  const source = answer?.source || 'empty';
  const category = categorizeField(question)?.category || 'generatable';

  return (
    <Card data-card-id={question.id} data-category={category}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{index + 1}</Badge>
          {question.required ? <Badge variant="outline">Required</Badge> : null}
          <Badge variant={source === 'ai' ? 'default' : source === 'user' || source === 'edited' ? 'secondary' : 'outline'}>
            {source === 'ai' ? 'AI generated' : source === 'user' || source === 'edited' ? 'User edited' : 'Needs input'}
          </Badge>
          <Badge variant="ghost">{question.type.replace('_', ' ')}</Badge>
        </div>
        <CardTitle>{question.text}</CardTitle>
        <CardDescription>{category.replace('_', ' ')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <QuestionField question={question} answerText={answerText} />
        {(source === 'ai' || source === 'autofill') && answer?.confidence ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence</span>
              <span>{Math.round(answer.confidence * 100)}%</span>
            </div>
            <Progress value={answer.confidence * 100} />
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button className="btn-undo" variant="outline" size="sm" data-question-id={question.id} disabled={!canUndo(question.id)} onClick={() => undoAnswer(question.id)}>Undo</Button>
        <Button className="btn-redo" variant="outline" size="sm" data-question-id={question.id} disabled={!canRedo(question.id)} onClick={() => redoAnswer(question.id)}>Redo</Button>
        {category !== 'manual_only' ? (
          <>
            <Button className="btn-regenerate" size="sm" data-question-id={question.id} onClick={onRegenerate}>Regenerate</Button>
            <Button className="btn-chip-action" variant="outline" size="sm" data-question-id={question.id} onClick={() => onQuickEdit('Make this answer more professional')}>Refine tone</Button>
          </>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function QuestionField({ question, answerText }) {
  const update = (value) => updateAnswer(question.id, value, 'user');

  if (question.type === 'long_text') return <Textarea className="answer-textarea" data-question-id={question.id} value={answerText} onChange={(event) => update(event.target.value)} placeholder="Type your answer..." />;
  if (question.type === 'short_text' || question.type === 'date') return <Input className="answer-textarea" data-question-id={question.id} type={question.type === 'date' ? 'date' : 'text'} value={answerText} onChange={(event) => update(event.target.value)} placeholder="Type your answer..." />;

  if (question.type === 'dropdown') {
    return (
      <Select value={answerText} onValueChange={update}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Select an option" /></SelectTrigger>
        <SelectContent><SelectGroup>{question.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    );
  }

  if (question.type === 'radio') {
    return (
      <RadioGroup value={answerText} onValueChange={update}>
        {question.options.map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-3xl border p-3">
            <RadioGroupItem value={option} />
            <span>{option}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }

  if (question.type === 'checkbox') {
    const values = answerText ? answerText.split(', ').filter(Boolean) : [];
    return (
      <div className="grid gap-3">
        {question.options.map((option) => {
          const checked = values.includes(option);
          return (
            <div key={option} className="flex items-center gap-3 rounded-3xl border p-3">
              <Checkbox checked={checked} onCheckedChange={(next) => {
                const nextValues = new Set(values);
                if (next) nextValues.add(option);
                else nextValues.delete(option);
                update(Array.from(nextValues).join(', '));
              }} />
              <Label>{option}</Label>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === 'scale') {
    return (
      <RadioGroup value={answerText} onValueChange={update} className="grid grid-cols-5 gap-3 md:grid-cols-10">
        {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((option) => (
          <label key={option} className="flex flex-col items-center gap-2 rounded-3xl border p-3 text-center">
            <RadioGroupItem value={option} />
            <span className="text-sm">{option}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }

  if (question.type === 'file_upload') {
    return (
      <Alert>
        <Icon name="upload_file" />
        <AlertTitle>File upload stays manual</AlertTitle>
        <AlertDescription>There is no direct shadcn file-upload equivalent in this registry. The field remains a flagged manual step.</AlertDescription>
      </Alert>
    );
  }

  return <Input className="answer-textarea" data-question-id={question.id} value={answerText} onChange={(event) => update(event.target.value)} placeholder="Type your answer..." />;
}
