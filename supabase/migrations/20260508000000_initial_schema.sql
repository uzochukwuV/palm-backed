-- Initial schema for Backed crowdfunding platform
-- This creates the core tables: profiles, projects, contributions, project_updates, project_resources

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  website_url text,
  twitter_url text,
  github_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 30),
  constraint username_format check (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Projects table
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  tagline text,
  description text,
  category text not null,
  cover_image_url text,
  funding_goal numeric,
  current_funding numeric default 0,
  backer_count integer default 0,
  status text default 'active' check (status in ('draft', 'active', 'funded', 'cancelled')),
  is_featured boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint title_length check (char_length(title) >= 3 and char_length(title) <= 100)
);

-- Contributions table
create table if not exists public.contributions (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  backer_id uuid references public.profiles(id) on delete set null,
  amount numeric not null check (amount > 0),
  message text,
  is_anonymous boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint amount_positive check (amount > 0)
);

-- Project updates table (for video/media updates)
create table if not exists public.project_updates (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  description text,
  media_type text check (media_type in ('video', 'image', 'text')),
  media_url text,
  thumbnail_url text,
  like_count integer default 0,
  view_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project resources table (links, documents, etc.)
create table if not exists public.project_resources (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  resource_type text check (resource_type in ('link', 'pdf', 'document', 'other')),
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for better query performance
create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists projects_creator_id_idx on public.projects(creator_id);
create index if not exists projects_category_idx on public.projects(category);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_created_at_idx on public.projects(created_at desc);
create index if not exists contributions_project_id_idx on public.contributions(project_id);
create index if not exists contributions_backer_id_idx on public.contributions(backer_id);
create index if not exists project_updates_project_id_idx on public.project_updates(project_id);
create index if not exists project_updates_creator_id_idx on public.project_updates(creator_id);
create index if not exists project_resources_project_id_idx on public.project_resources(project_id);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.contributions enable row level security;
alter table public.project_updates enable row level security;
alter table public.project_resources enable row level security;

-- RLS Policies for profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies for projects
create policy "Projects are viewable by everyone"
  on public.projects for select
  using (true);

create policy "Authenticated users can create projects"
  on public.projects for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update their own projects"
  on public.projects for update
  using (auth.uid() = creator_id);

create policy "Creators can delete their own projects"
  on public.projects for delete
  using (auth.uid() = creator_id);

-- RLS Policies for contributions
create policy "Contributions are viewable by everyone"
  on public.contributions for select
  using (true);

create policy "Authenticated users can create contributions"
  on public.contributions for insert
  with check (auth.uid() = backer_id or backer_id is null);

-- RLS Policies for project_updates
create policy "Project updates are viewable by everyone"
  on public.project_updates for select
  using (true);

create policy "Creators can create updates for their projects"
  on public.project_updates for insert
  with check (
    auth.uid() = creator_id and
    exists (
      select 1 from public.projects
      where id = project_id and creator_id = auth.uid()
    )
  );

create policy "Creators can update their own updates"
  on public.project_updates for update
  using (auth.uid() = creator_id);

create policy "Creators can delete their own updates"
  on public.project_updates for delete
  using (auth.uid() = creator_id);

-- RLS Policies for project_resources
create policy "Project resources are viewable by everyone"
  on public.project_resources for select
  using (true);

create policy "Creators can add resources to their projects"
  on public.project_resources for insert
  with check (
    exists (
      select 1 from public.projects
      where id = project_id and creator_id = auth.uid()
    )
  );

create policy "Creators can update resources on their projects"
  on public.project_resources for update
  using (
    exists (
      select 1 from public.projects
      where id = project_id and creator_id = auth.uid()
    )
  );

create policy "Creators can delete resources from their projects"
  on public.project_resources for delete
  using (
    exists (
      select 1 from public.projects
      where id = project_id and creator_id = auth.uid()
    )
  );

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_projects_updated_at
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

create trigger handle_project_updates_updated_at
  before update on public.project_updates
  for each row execute procedure public.handle_updated_at();

-- Made with Bob
