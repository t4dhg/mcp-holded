import { deleteOne, post, put, seg } from '../http-client.js';
import { AnyRecord, Project, ProjectTime, Task, inputs } from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export function listProjects(params: { limit?: number; cursor?: string; status?: string } = {}) {
  return fetchPage('/projects', Project, { ...params });
}

export function getProject(id: string) {
  return fetchOne(`/projects/${seg(id)}`, Project);
}

export function getProjectSummary(id: string) {
  return fetchOne(`/projects/${seg(id)}/summary`, AnyRecord);
}

export async function createProject(input: z.infer<typeof inputs.ProjectInput>) {
  const id = await createAndReturnId('/projects', input);
  return getProject(id);
}

export async function updateProject(id: string, input: z.infer<typeof inputs.ProjectUpdateInput>) {
  await put(`/projects/${seg(id)}`, input);
  return getProject(id);
}

export async function deleteProject(id: string): Promise<void> {
  await deleteOne(`/projects/${seg(id)}`);
}

export function listTasks(params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/tasks', Task, { ...params });
}

export function getTask(id: string) {
  return fetchOne(`/tasks/${seg(id)}`, Task);
}

export async function createTask(input: z.infer<typeof inputs.TaskInput>) {
  const id = await createAndReturnId('/tasks', input);
  return getTask(id);
}

export async function updateTask(id: string, input: z.infer<typeof inputs.TaskUpdateInput>) {
  await put(`/tasks/${seg(id)}`, input);
  return getTask(id);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteOne(`/tasks/${seg(id)}`);
}

export function listProjectTimes(
  projectId?: string,
  params: { limit?: number; cursor?: string } = {}
) {
  const endpoint = projectId ? `/projects/${seg(projectId)}/times` : '/project-times';
  return fetchPage(endpoint, ProjectTime, { ...params });
}

export function getProjectTime(projectId: string, timeId: string) {
  return fetchOne(`/projects/${seg(projectId)}/times/${seg(timeId)}`, ProjectTime);
}

export function createProjectTime(
  projectId: string,
  input: z.infer<typeof inputs.ProjectTimeInput>
) {
  return post(`/projects/${seg(projectId)}/times`, input);
}

export function updateProjectTime(
  projectId: string,
  timeId: string,
  input: z.infer<typeof inputs.ProjectTimeUpdateInput>
) {
  return put(`/projects/${seg(projectId)}/times/${seg(timeId)}`, input);
}

export async function deleteProjectTime(projectId: string, timeId: string): Promise<void> {
  await deleteOne(`/projects/${seg(projectId)}/times/${seg(timeId)}`);
}
