"use client";

import { Button, Input, Label, Textarea } from "@/components/ui";
import type { ResumeContent } from "@/lib/types";

export function ResumeEditor({
  content,
  onChange,
}: {
  content: ResumeContent;
  onChange: (content: ResumeContent) => void;
}) {
  function updateProjectBullet(projectIndex: number, bulletIndex: number, value: string) {
    onChange({
      ...content,
      projects: content.projects.map((project, index) =>
        index === projectIndex
          ? { ...project, bullets: project.bullets.map((bullet, itemIndex) => (itemIndex === bulletIndex ? value : bullet)) }
          : project,
      ),
    });
  }

  function addBullet(projectIndex: number) {
    onChange({
      ...content,
      projects: content.projects.map((project, index) =>
        index === projectIndex ? { ...project, bullets: [...project.bullets, "Add a proof-backed bullet."] } : project,
      ),
    });
  }

  function removeBullet(projectIndex: number, bulletIndex: number) {
    onChange({
      ...content,
      projects: content.projects.map((project, index) =>
        index === projectIndex ? { ...project, bullets: project.bullets.filter((_, itemIndex) => itemIndex !== bulletIndex) } : project,
      ),
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Summary</Label>
        <Textarea value={content.summary} rows={5} onChange={(event) => onChange({ ...content, summary: event.target.value })} />
      </div>

      <div className="space-y-4">
        {content.projects.map((project, projectIndex) => (
          <div key={`${project.title}-${projectIndex}`} className="rounded-lg border bg-white p-4">
            <Label>Project title</Label>
            <Input
              className="mt-2"
              value={project.title}
              onChange={(event) =>
                onChange({
                  ...content,
                  projects: content.projects.map((item, index) => (index === projectIndex ? { ...item, title: event.target.value } : item)),
                })
              }
            />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Bullets</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => addBullet(projectIndex)}>
                  Add bullet
                </Button>
              </div>
              {project.bullets.map((bullet, bulletIndex) => (
                <div key={`${bulletIndex}-${project.title}`} className="flex gap-2">
                  <Textarea
                    value={bullet}
                    rows={2}
                    onChange={(event) => updateProjectBullet(projectIndex, bulletIndex, event.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeBullet(projectIndex, bulletIndex)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
