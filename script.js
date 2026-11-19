const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const siteHeader = document.querySelector('.site-header');
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Tutup menu' : 'Buka menu');
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Buka menu');
  }));
}

const themeToggle = document.querySelector('.theme-toggle');
if (themeToggle) {
  const savedTheme = localStorage.getItem('portfolio-theme');
  const applyTheme = isDark => {
    document.body.classList.toggle('dark-mode', isDark);
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    themeToggle.textContent = isDark ? 'Mode terang' : 'Mode gelap';
  };
  applyTheme(savedTheme === 'dark');
  themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    applyTheme(isDark);
    localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
  });
}

const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
toastContainer.setAttribute('aria-live', 'polite');
toastContainer.setAttribute('aria-label', 'Notifikasi');
document.body.append(toastContainer);

const showToast = (message, type = 'success') => {
  if (!message) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const text = document.createElement('p');
  text.className = 'toast-message';
  text.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'toast-close';
  closeButton.setAttribute('aria-label', 'Tutup notifikasi');
  closeButton.textContent = 'X';

  let dismissTimer;
  const dismiss = () => {
    window.clearTimeout(dismissTimer);
    toast.remove();
  };
  closeButton.addEventListener('click', dismiss);
  toast.append(text, closeButton);
  toastContainer.append(toast);
  dismissTimer = window.setTimeout(dismiss, 5000);
};

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const progressIndicator = document.querySelector('.scroll-progress > span');
if (progressIndicator && !reducedMotion) {
  let progressFrame = 0;
  const updateScrollProgress = () => {
    progressFrame = 0;
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    progressIndicator.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  };
  const scheduleScrollProgress = () => {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(updateScrollProgress);
  };
  window.addEventListener('scroll', scheduleScrollProgress, { passive: true });
  window.addEventListener('resize', scheduleScrollProgress);
  scheduleScrollProgress();
}

const heroSection = document.querySelector('.hero');
if (!reducedMotion && heroSection && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const heroLines = heroSection.querySelectorAll('.hero-line');
  heroLines.forEach((line, index) => {
    line.classList.add('hero-line-reveal');
    line.style.setProperty('--line-delay', `${index * 130}ms`);
  });
  heroSection.addEventListener('pointermove', event => {
    const bounds = heroSection.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    heroSection.style.setProperty('--pointer-x', `${x * 12}px`);
    heroSection.style.setProperty('--pointer-y', `${y * 12}px`);
  });
  heroSection.addEventListener('pointerleave', () => {
    heroSection.style.setProperty('--pointer-x', '0px');
    heroSection.style.setProperty('--pointer-y', '0px');
  });
}

if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.hero-cta').forEach(button => {
    button.addEventListener('pointermove', event => {
      const bounds = button.getBoundingClientRect();
      const x = event.clientX - (bounds.left + bounds.width / 2);
      const y = event.clientY - (bounds.top + bounds.height / 2);
      button.style.setProperty('--magnetic-x', `${Math.max(-4, Math.min(4, x * .08))}px`);
      button.style.setProperty('--magnetic-y', `${Math.max(-4, Math.min(4, y * .08))}px`);
    });
    button.addEventListener('pointerleave', () => {
      button.style.setProperty('--magnetic-x', '0px');
      button.style.setProperty('--magnetic-y', '0px');
    });
  });
}

const revealObserver = !reducedMotion && 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' })
  : null;

const observeReveal = elements => {
  if (!revealObserver) return;
  elements.forEach((element, index) => {
    element.classList.remove('is-visible');
    element.classList.add('reveal-item');
    element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 70}ms`);
    revealObserver.observe(element);
  });
};

if (revealObserver) {
  document.documentElement.classList.add('motion-ready');
  observeReveal(document.querySelectorAll(
    '.hero-copy > *, .hero-education, .section-heading-row, .profile-layout > *, .project-card, .archive-content, .archive-intro, .archive-timeline-entry, .contact-inner > *'
  ));
}

if (navLinks) {
  const sectionLinks = [...navLinks.querySelectorAll('a[href^="#"]')];
  const sections = [...document.querySelectorAll('main section[id]')];
  let navigationFrame = 0;
  const updateActiveNavigation = () => {
    navigationFrame = 0;
    if (siteHeader) siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
    const activationLine = Math.min(window.innerHeight * .35, 280);
    let activeSection = sections[0];
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= activationLine) activeSection = section;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      activeSection = sections[sections.length - 1];
    }
    sectionLinks.forEach(link => {
      const active = link.hash === `#${activeSection.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const scheduleActiveNavigation = () => {
    if (navigationFrame) return;
    navigationFrame = window.requestAnimationFrame(updateActiveNavigation);
  };
  window.addEventListener('scroll', scheduleActiveNavigation, { passive: true });
  window.addEventListener('resize', scheduleActiveNavigation);
  scheduleActiveNavigation();
}

const portraitImage = document.querySelector('.about-portrait-frame img');
if (!reducedMotion && portraitImage) {
  let parallaxFrame = 0;
  const updatePortraitParallax = () => {
    parallaxFrame = 0;
    const bounds = portraitImage.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
    const distance = window.innerHeight / 2 - (bounds.top + bounds.height / 2);
    const offset = Math.max(-7, Math.min(7, distance / window.innerHeight * 10));
    portraitImage.style.setProperty('--parallax-y', `${offset}px`);
  };
  const schedulePortraitParallax = () => {
    if (parallaxFrame) return;
    parallaxFrame = window.requestAnimationFrame(updatePortraitParallax);
  };
  window.addEventListener('scroll', schedulePortraitParallax, { passive: true });
  window.addEventListener('resize', schedulePortraitParallax);
  schedulePortraitParallax();
}

const projectGrid = document.querySelector('.project-grid');
const projectFilters = document.querySelector('.project-filters');
const projectFilterEmpty = document.querySelector('#project-filter-empty');
const projectLoadStatus = document.querySelector('#project-load-status');
const profileProjectTags = document.querySelector('#profile-project-tags');
const projectForm = document.querySelector('#project-form');
const projectLoginForm = document.querySelector('#project-login-form');
const projectMessage = document.querySelector('#project-message');
const projectDetailDialog = document.querySelector('#project-detail-dialog');

if (projectGrid && projectForm && projectLoginForm && projectMessage && projectDetailDialog) {
  const projectTemplates = Array.from(projectGrid.querySelectorAll('.project-card'));
  const logoutButton = projectLoginForm.querySelector('.project-logout');
  const passwordInput = projectLoginForm.elements.namedItem('password');
  const formTitle = projectForm.elements.namedItem('title');
  const formCategory = projectForm.elements.namedItem('category');
  const formDescription = projectForm.elements.namedItem('description');
  const formPurpose = projectForm.elements.namedItem('purpose');
  const formDocumentationUrl = projectForm.elements.namedItem('documentationUrl');
  const formTags = projectForm.elements.namedItem('tags');
  const formImage = projectForm.elements.namedItem('image');
  const imagePositionX = projectForm.elements.namedItem('imagePositionX');
  const imagePositionY = projectForm.elements.namedItem('imagePositionY');
  const imageEditor = projectForm.querySelector('.project-image-editor');
  const imagePreview = projectForm.querySelector('.project-image-preview');
  const removeImageCheckbox = projectForm.elements.namedItem('removeImage');
  const submitButton = projectForm.querySelector('.project-submit');
  const cancelButton = projectForm.querySelector('.project-cancel');
  let editingProjectId = null;
  let isAdmin = false;
  let projects = [];
  let previewObjectUrl = null;
  const maxProjectImageSize = 1024 * 1024;
  const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  let activeProjectFilter = 'all';
  let hasLoadedProjects = false;

  const projectCategoryLabels = new Map([
    ['DESAIN UI/UX', 'Desain UI/UX'],
    ['UI/UX DESIGN', 'Desain UI/UX'],
    ['PENGEMBANGAN WEB', 'Pengembangan web'],
    ['WEB DEVELOPMENT', 'Pengembangan web'],
    ['MACHINE LEARNING', 'Machine learning'],
    ['PROGRAMMING', 'Programming'],
    ['DATABASE', 'Database']
  ]);
  const projectCategoryFilters = new Map([
    ['DESAIN UI/UX', 'ui/ux design'],
    ['UI/UX DESIGN', 'ui/ux design'],
    ['PENGEMBANGAN WEB', 'web development'],
    ['WEB DEVELOPMENT', 'web development'],
    ['MACHINE LEARNING', 'machine learning'],
    ['PROGRAMMING', 'programming'],
    ['DATABASE', 'database']
  ]);
  const showProjectMessage = message => {
    projectMessage.textContent = message;
    if (!message) return;
    const isError = /gagal|tidak dapat|tidak ditemukan|wajib|harus|maksimal|tidak valid|berformat/i.test(message);
    showToast(message, isError ? 'error' : 'success');
  };

  const formatProjectCategory = category => {
    return projectCategoryLabels.get(category.trim().toLocaleUpperCase('id')) || category;
  };
  const projectCategoryFilter = category => projectCategoryFilters.get(category.trim().toLocaleUpperCase('id'))
    || formatProjectCategory(category).toLocaleLowerCase('id');
  const isHttpUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };
  const renderProfileProjectTags = savedProjects => {
    if (!profileProjectTags) return;
    const tags = [...new Set(savedProjects.flatMap(project => project.tags)
      .filter(tag => !/^https?:\/\//i.test(tag)))];
    if (tags.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'Belum ada teknologi atau metode yang dicatat.';
      profileProjectTags.replaceChildren(empty);
      return;
    }
    profileProjectTags.replaceChildren(...tags.map(tag => {
      const item = document.createElement('li');
      item.textContent = tag;
      return item;
    }));
  };

  const applyProjectFilter = (category = activeProjectFilter, animate = true) => {
    activeProjectFilter = category;
    if (!hasLoadedProjects) {
      if (projectFilters) {
        projectFilters.querySelectorAll('[data-project-filter]').forEach(button => {
          button.setAttribute('aria-pressed', String(button.dataset.projectFilter === category));
        });
      }
      return;
    }
    const cards = [...projectGrid.querySelectorAll('.project-card')];
    let visibleCount = 0;
    cards.forEach(card => {
      const matches = category === 'all' || card.dataset.category === category;
      if (matches) {
        const wasHidden = card.hidden;
        card.hidden = false;
        if (animate && wasHidden && !reducedMotion) {
          card.classList.add('filter-enter');
          window.requestAnimationFrame(() => card.classList.remove('filter-enter'));
        }
        visibleCount += 1;
      } else {
        card.hidden = true;
        card.classList.remove('filter-enter');
      }
    });
    if (projectFilterEmpty) projectFilterEmpty.hidden = cards.length === 0 || visibleCount > 0;
    if (projectFilters) {
      projectFilters.querySelectorAll('[data-project-filter]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.projectFilter === category));
      });
    }
  };

  const isValidProject = project => project
    && typeof project.id === 'string'
    && typeof project.title === 'string'
    && typeof project.category === 'string'
    && typeof project.description === 'string'
    && (project.purpose === undefined
      || (typeof project.purpose === 'string' && project.purpose.length <= 500))
    && (project.documentationUrl === undefined || project.documentationUrl === null
      || (typeof project.documentationUrl === 'string'
        && project.documentationUrl.length <= 2048
        && isHttpUrl(project.documentationUrl)))
    && typeof project.status === 'string'
    && Array.isArray(project.tags)
    && project.tags.every(tag => typeof tag === 'string')
    && (project.image === undefined || project.image === null
      || (typeof project.image === 'string'
        && (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(project.image)
          || /^images\/[A-Za-z0-9._-]+$/.test(project.image))))
    && (project.imagePositionX === undefined
      || (Number.isInteger(project.imagePositionX) && project.imagePositionX >= 0 && project.imagePositionX <= 100))
    && (project.imagePositionY === undefined
      || (Number.isInteger(project.imagePositionY) && project.imagePositionY >= 0 && project.imagePositionY <= 100))
    && (project.templateIndex === null
      || (Number.isInteger(project.templateIndex)
        && project.templateIndex >= 0
        && project.templateIndex < projectTemplates.length));

  const requestApi = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) setAdminState(false);
      throw new Error(result.error || `Permintaan gagal (${response.status}).`);
    }
    return result;
  };

  const setAdminState = authenticated => {
    isAdmin = authenticated;
    passwordInput.closest('label').hidden = authenticated;
    projectLoginForm.querySelector('button[type="submit"]').hidden = authenticated;
    logoutButton.hidden = !authenticated;
    projectForm.hidden = !authenticated;
    window.dispatchEvent(new CustomEvent('portfolio-admin-state', {
      detail: { authenticated }
    }));
    renderProjects();
  };

  const createGeneratedCard = () => {
    const card = document.createElement('article');
    card.className = 'project-card';
    const art = document.createElement('div');
    art.className = 'project-art project-art-generated';
    card.append(art);
    const meta = document.createElement('div');
    meta.className = 'project-meta';
    const category = document.createElement('span');
    meta.append(category);
    card.append(meta);
    card.append(document.createElement('h3'), document.createElement('p'));
    return card;
  };

  const renderProjects = () => {
    if (projects.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'project-empty';
      emptyState.textContent = 'Belum ada proyek yang ditampilkan.';
      projectGrid.replaceChildren(emptyState);
      if (projectLoadStatus) projectLoadStatus.hidden = true;
      if (projectFilterEmpty) projectFilterEmpty.hidden = true;
      return;
    }
    if (projectLoadStatus) projectLoadStatus.hidden = true;
    const cards = projects.map(project => {
      const template = Number.isInteger(project.templateIndex)
        ? projectTemplates[project.templateIndex]
        : null;
      const card = template ? template.cloneNode(true) : createGeneratedCard();
      card.hidden = false;
      card.classList.remove('is-visible', 'reveal-item');
      card.dataset.category = projectCategoryFilter(project.category);
      const art = card.querySelector('.project-art');
      art.replaceChildren();
      art.classList.toggle('has-project-photo', Boolean(project.image));
      if (project.image) {
        const image = document.createElement('img');
        image.className = 'project-card-photo';
        image.src = project.image;
        image.alt = `Foto proyek ${project.title}`;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.style.objectPosition = `${project.imagePositionX}% ${project.imagePositionY}%`;
        art.append(image);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'project-image-placeholder';
        placeholder.textContent = 'Foto belum ditambahkan';
        art.append(placeholder);
      }
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'project-art-preview';
      preview.dataset.action = 'details';
      preview.dataset.projectId = project.id;
      const previewCategory = document.createElement('span');
      previewCategory.textContent = formatProjectCategory(project.category);
      const previewTitle = document.createElement('strong');
      previewTitle.textContent = project.title;
      const previewAction = document.createElement('span');
      previewAction.textContent = 'VIEW PROJECT';
      preview.append(previewCategory, previewTitle, previewAction);
      art.append(preview);
      card.querySelector('.project-meta > span').textContent = formatProjectCategory(project.category);
      const status = card.querySelector('.project-status');
      if (status) status.remove();
      card.querySelector('h3').textContent = project.title;
      card.querySelector(':scope > p').textContent = project.description;
      const tagList = card.querySelector('.tag-list');
      if (tagList) tagList.remove();

      const visibleTags = project.tags.filter(tag => !/^https?:\/\//i.test(tag)).slice(0, 4);
      if (visibleTags.length > 0) {
        const projectTags = document.createElement('ul');
        projectTags.className = 'project-tags';
        projectTags.setAttribute('aria-label', 'Teknologi proyek');
        visibleTags.forEach(tag => {
          const item = document.createElement('li');
          item.textContent = tag;
          projectTags.append(item);
        });
        card.append(projectTags);
      }

      const actions = document.createElement('div');
      actions.className = 'project-actions';
      const actionsToShow = isAdmin
        ? [['details', 'Lihat detail'], ['edit', 'Edit'], ['delete', 'Hapus']]
        : [['details', 'Lihat detail']];
      actionsToShow.forEach(([action, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.action = action;
        button.dataset.projectId = project.id;
        button.textContent = label;
        actions.append(button);
      });
      card.append(actions);
      return card;
    });
    projectGrid.replaceChildren(...cards);
    applyProjectFilter(activeProjectFilter, false);
    observeReveal(cards);
  };

  if (projectFilters) {
    projectFilters.addEventListener('click', event => {
      const button = event.target.closest('[data-project-filter]');
      if (!button) return;
      applyProjectFilter(button.dataset.projectFilter);
    });
  }

  const saveProjects = async (method, url, project) => {
    try {
      projects = await requestApi(url, {
        method,
        ...(project ? { body: JSON.stringify(project) } : {})
      });
    } catch (error) {
      showProjectMessage(`Perubahan tidak dapat disimpan: ${error.message}`);
      return false;
    }
    renderProjects();
    return true;
  };

  const resetProjectForm = () => {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
    editingProjectId = null;
    projectForm.reset();
    imageEditor.hidden = true;
    imagePreview.removeAttribute('src');
    submitButton.textContent = 'Tambah proyek';
    cancelButton.hidden = true;
  };

  const updateImagePreviewPosition = () => {
    imagePreview.style.objectPosition = `${imagePositionX.value}% ${imagePositionY.value}%`;
  };

  [imagePositionX, imagePositionY].forEach(input => {
    input.addEventListener('input', updateImagePreviewPosition);
  });

  formImage.addEventListener('change', () => {
    const imageFile = formImage.files[0];
    if (!imageFile) return;
    if (!imageMimeTypes.includes(imageFile.type)) {
      formImage.value = '';
      showProjectMessage('Foto harus berformat JPG, PNG, atau WebP.');
      return;
    }
    if (imageFile.size > maxProjectImageSize) {
      formImage.value = '';
      showProjectMessage('Ukuran foto sampul maksimal 1 MB.');
      return;
    }
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(imageFile);
    imagePreview.src = previewObjectUrl;
    imageEditor.hidden = false;
    removeImageCheckbox.checked = false;
    imagePositionX.value = '50';
    imagePositionY.value = '50';
    updateImagePreviewPosition();
  });

  projectLoginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = projectLoginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await requestApi('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password: passwordInput.value })
      });
      passwordInput.value = '';
      setAdminState(true);
      showProjectMessage('Berhasil masuk sebagai admin.');
    } catch (error) {
      showProjectMessage(`Login gagal: ${error.message}`);
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    try {
      await requestApi('/api/logout', { method: 'POST' });
      resetProjectForm();
      setAdminState(false);
      showProjectMessage('Anda sudah keluar dari admin.');
    } catch (error) {
      showProjectMessage(`Gagal keluar: ${error.message}`);
    }
  });

  Promise.all([requestApi('/api/projects'), requestApi('/api/session')])
    .then(([savedProjects, session]) => {
      if (!Array.isArray(savedProjects) || !savedProjects.every(isValidProject)) {
        throw new Error('Data proyek dari server memiliki format yang tidak valid.');
      }
      projects = savedProjects.map(project => ({
        ...project,
        imagePositionX: project.imagePositionX ?? 50,
        imagePositionY: project.imagePositionY ?? 50
      }));
      hasLoadedProjects = true;
      renderProfileProjectTags(projects);
      setAdminState(session.authenticated);
      showProjectMessage('');
    })
    .catch(error => {
      if (projectLoadStatus) projectLoadStatus.textContent = 'Karya belum dapat dimuat. Pastikan server berjalan.';
      if (profileProjectTags) {
        const unavailable = document.createElement('li');
        unavailable.textContent = 'Informasi belum dapat dimuat.';
        profileProjectTags.replaceChildren(unavailable);
      }
      showProjectMessage(`Data proyek tidak dapat dimuat: ${error.message}`);
    });

  projectForm.addEventListener('submit', async event => {
    event.preventDefault();
    const projectData = {
      title: formTitle.value.trim(),
      category: formCategory.value.trim(),
      description: formDescription.value.trim(),
      purpose: formPurpose.value.trim(),
      documentationUrl: formDocumentationUrl.value.trim(),
      tags: formTags.value.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    if (!projectData.title || !projectData.category || !projectData.description) {
      showProjectMessage('Nama, kategori, dan deskripsi proyek wajib diisi.');
      return;
    }

    const imageFile = formImage.files[0];
    const currentProject = projects.find(project => project.id === editingProjectId);
    let image = currentProject?.image || null;
    if (removeImageCheckbox.checked) image = null;
    if (imageFile) {
      try {
        image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Hasil pembacaan foto tidak valid.'));
          });
          reader.addEventListener('error', () => {
            reject(reader.error || new Error('Foto gagal dibaca.'));
          });
          reader.readAsDataURL(imageFile);
        });
      } catch (error) {
        showProjectMessage(`Foto sampul tidak dapat dibaca: ${error.message}`);
        return;
      }
    }
    projectData.image = image;
    projectData.imagePositionX = Number(imagePositionX.value);
    projectData.imagePositionY = Number(imagePositionY.value);

    const wasEditing = Boolean(editingProjectId);
    const saved = await saveProjects(
      wasEditing ? 'PUT' : 'POST',
      wasEditing ? `/api/projects/${encodeURIComponent(editingProjectId)}` : '/api/projects',
      projectData
    );
    if (saved) {
      showProjectMessage(wasEditing ? 'Proyek berhasil diperbarui.' : 'Proyek berhasil ditambahkan.');
      resetProjectForm();
    }
  });

  projectGrid.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const project = projects.find(item => item.id === button.dataset.projectId);
    if (!project) {
      showProjectMessage('Proyek tidak ditemukan. Muat ulang halaman dan coba lagi.');
      return;
    }

    if (button.dataset.action === 'details') {
      projectDetailDialog.querySelector('#project-detail-title').textContent = project.title;
      projectDetailDialog.querySelector('.project-detail-meta').textContent = formatProjectCategory(project.category);
      projectDetailDialog.querySelector('.project-detail-description').textContent = project.description;
      const purposeSection = projectDetailDialog.querySelector('.project-detail-purpose');
      const purpose = typeof project.purpose === 'string' ? project.purpose.trim() : '';
      purposeSection.hidden = !purpose;
      purposeSection.querySelector('p').textContent = purpose;
      const documentationLink = projectDetailDialog.querySelector('.project-detail-documentation');
      const documentationUrl = typeof project.documentationUrl === 'string'
        && isHttpUrl(project.documentationUrl)
        ? project.documentationUrl
        : '';
      documentationLink.hidden = !documentationUrl;
      documentationLink.href = documentationUrl || '#';
      const detailImage = projectDetailDialog.querySelector('.project-detail-image');
      detailImage.hidden = !project.image;
      if (project.image) {
        detailImage.src = project.image;
        detailImage.alt = `Pratinjau ${project.title}`;
      } else {
        detailImage.removeAttribute('src');
        detailImage.alt = '';
      }
      const detailTags = projectDetailDialog.querySelector('.project-detail-tags');
      const availableTags = project.tags.filter(tag => !/^https?:\/\//i.test(tag));
      detailTags.replaceChildren(...availableTags.map(tag => {
        const item = document.createElement('li');
        item.textContent = tag;
        return item;
      }));
      detailTags.hidden = availableTags.length === 0;
      const demoLink = projectDetailDialog.querySelector('.project-detail-demo');
      const demoUrl = project.tags.map(tag => {
        try {
          const url = new URL(tag);
          return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
        } catch {
          return null;
        }
      }).find(Boolean);
      demoLink.hidden = !demoUrl;
      demoLink.href = demoUrl || '#';
      demoLink.textContent = demoUrl && new URL(demoUrl).hostname === 'github.com'
        ? 'Lihat repository ↗'
        : 'Buka demo proyek ↗';
      projectDetailDialog.showModal();
      return;
    }

    if (button.dataset.action === 'edit') {
      editingProjectId = project.id;
      formTitle.value = project.title;
      formCategory.value = project.category;
      formDescription.value = project.description;
      formPurpose.value = project.purpose || '';
      formDocumentationUrl.value = project.documentationUrl || '';
      formTags.value = project.tags.join(', ');
      formImage.value = '';
      imagePositionX.value = String(project.imagePositionX);
      imagePositionY.value = String(project.imagePositionY);
      removeImageCheckbox.checked = false;
      imageEditor.hidden = !project.image;
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
      if (project.image) {
        imagePreview.src = project.image;
        updateImagePreviewPosition();
      } else {
        imagePreview.removeAttribute('src');
      }
      submitButton.textContent = 'Simpan perubahan';
      cancelButton.hidden = false;
      formTitle.focus();
      showProjectMessage(`Sedang mengedit: ${project.title}`);
      return;
    }

    if (button.dataset.action === 'delete' && isAdmin
        && window.confirm(`Hapus proyek "${project.title}" dari daftar?`)) {
      if (await saveProjects('DELETE', `/api/projects/${encodeURIComponent(project.id)}`)) {
        if (editingProjectId === project.id) resetProjectForm();
        showProjectMessage('Proyek berhasil dihapus.');
      }
    }
  });

  cancelButton.addEventListener('click', () => {
    resetProjectForm();
    showProjectMessage('Edit dibatalkan.');
  });

  projectDetailDialog.querySelector('.project-detail-close').addEventListener('click', () => {
    projectDetailDialog.close();
  });
}

const assignmentList = document.querySelector('#assignment-list');
const assignmentForm = document.querySelector('#assignment-form');
const assignmentFeedback = document.querySelector('#assignment-feedback');

if (assignmentList && assignmentForm && assignmentFeedback) {
  const assignmentSemester = assignmentForm.elements.namedItem('semester');
  const assignmentCourse = assignmentForm.elements.namedItem('course');
  const assignmentTitle = assignmentForm.elements.namedItem('title');
  const assignmentCategory = assignmentForm.elements.namedItem('category');
  const assignmentDescription = assignmentForm.elements.namedItem('description');
  const assignmentDueDate = assignmentForm.elements.namedItem('dueDate');
  const assignmentStatus = assignmentForm.elements.namedItem('status');
  const assignmentExternalUrl = assignmentForm.elements.namedItem('externalUrl');
  const assignmentFile = assignmentForm.elements.namedItem('file');
  const assignmentSubmit = assignmentForm.querySelector('.archive-submit');
  const assignmentCancel = assignmentForm.querySelector('.archive-cancel');
  const assignmentCount = document.querySelector('#archive-count');
  const assignmentHeading = document.querySelector('#archive-list-title');
  const assignmentLoginLink = document.querySelector('#archive-login-link');
  const assignmentSearch = document.querySelector('#assignment-search');
  const courseFilter = document.querySelector('#assignment-course-filter');
  const courseOptions = document.querySelector('#semester-five-course-options');
  const semesterFiveCourses = [
    'Pemrograman Berbasis Platform',
    'Tata Tulis Ilmiah (metopen)',
    'Natural language processing',
    'Data science',
    'Analisis dan Design PL',
    'AIK 4 (islam dan ilmu pengetahuan)',
    'Manajemen Proyek Teknologi Informasi',
    'Interaksi Manusia Komputer'
  ];
  if (courseOptions) {
    courseOptions.replaceChildren(...semesterFiveCourses.map(course => new Option(course, course)));
  }
  const courseAliases = new Map(semesterFiveCourses.map(course => [
    course.toLocaleLowerCase('id'),
    course
  ]));
  courseAliases.set('tata tulis ilmiah', 'Tata Tulis Ilmiah (metopen)');
  let assignments = [];
  let editingAssignmentId = null;
  let isAssignmentAdmin = false;

  const getCourseLabel = course => {
    const trimmedCourse = course.trim();
    return courseAliases.get(trimmedCourse.toLocaleLowerCase('id')) || trimmedCourse;
  };

  const setAssignmentFeedback = (message, isError = false) => {
    assignmentFeedback.textContent = message;
    assignmentFeedback.classList.toggle('is-error', isError);
    if (message) showToast(message, isError ? 'error' : 'success');
  };

  const assignmentRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Permintaan gagal (${response.status}).`);
    return result;
  };

  const formatFileSize = bytes => {
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatAssignmentDate = value => {
    if (!value) return '';
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };

  const addAssignmentMeta = (container, text, className = '') => {
    const label = document.createElement('span');
    if (className) label.className = className;
    label.textContent = text;
    container.append(label);
  };

  const updateCourseFilter = () => {
    if (!courseFilter) return;
    const selectedCourse = courseFilter.value;
    const courses = [...new Set([
      ...semesterFiveCourses,
      ...assignments
        .filter(assignment => Number(assignment.semester) === 5)
        .map(assignment => getCourseLabel(assignment.course))
    ])].sort((first, second) => first.localeCompare(second, 'id'));
    const options = [new Option('Semua mata kuliah', ''), ...courses.map(course => new Option(course, course))];
    courseFilter.replaceChildren(...options);
    if (courses.includes(selectedCourse)) courseFilter.value = selectedCourse;
  };

  updateCourseFilter();

  const renderAssignments = () => {
    updateCourseFilter();
    const searchTerm = assignmentSearch ? assignmentSearch.value.trim().toLocaleLowerCase('id') : '';
    const selectedCourse = courseFilter ? courseFilter.value : '';
    const semesterFiveAssignments = assignments.filter(assignment => Number(assignment.semester) === 5);
    const filteredAssignments = semesterFiveAssignments.filter(assignment => {
      const courseLabel = getCourseLabel(assignment.course);
      const matchesCourse = !selectedCourse || courseLabel === selectedCourse;
      const searchableText = [
        assignment.title,
        assignment.course,
        courseLabel,
        assignment.description,
        assignment.category,
        assignment.status
      ].join(' ').toLocaleLowerCase('id');
      return matchesCourse && searchableText.includes(searchTerm);
    });
    assignmentHeading.textContent = 'Daftar tugas';
    assignmentCount.textContent = `${filteredAssignments.length} dari ${semesterFiveAssignments.length} tugas`;

    const courseGroups = new Map();
    if (!searchTerm) {
      const coursesToShow = selectedCourse
        ? [selectedCourse]
        : [...new Set([
          ...semesterFiveCourses,
          ...semesterFiveAssignments.map(assignment => getCourseLabel(assignment.course))
        ])];
      coursesToShow.forEach(course => courseGroups.set(course, []));
    }
    filteredAssignments.forEach(assignment => {
      const courseLabel = getCourseLabel(assignment.course);
      if (!courseGroups.has(courseLabel)) courseGroups.set(courseLabel, []);
      courseGroups.get(courseLabel).push(assignment);
    });

    const folders = Array.from(courseGroups.entries())
      .sort(([firstCourse], [secondCourse]) => firstCourse.localeCompare(secondCourse, 'id'))
      .map(([course, courseAssignments]) => {
        const folder = document.createElement('details');
        folder.className = 'archive-course-folder';
        const summary = document.createElement('summary');
        summary.className = 'archive-course-folder-summary';
        const icon = document.createElement('span');
        icon.className = 'archive-course-folder-icon';
        icon.setAttribute('aria-hidden', 'true');
        const name = document.createElement('span');
        name.className = 'archive-course-folder-name';
        name.textContent = course;
        const count = document.createElement('span');
        count.className = 'archive-course-folder-count';
        count.textContent = `${courseAssignments.length} tugas`;
        summary.append(icon, name, count);

        const contents = document.createElement('div');
        contents.className = 'archive-course-folder-content';
        if (courseAssignments.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'archive-course-empty';
          empty.textContent = 'Belum ada tugas untuk mata kuliah ini.';
          contents.append(empty);
        }
        courseAssignments.forEach(assignment => {
          const item = document.createElement('article');
          item.className = 'archive-item';
          const details = document.createElement('div');
          details.className = 'archive-item-details';
          const title = document.createElement('h4');
          title.textContent = assignment.title;
          const description = document.createElement('p');
          description.className = 'archive-item-description';
          description.textContent = assignment.description;
          const meta = document.createElement('div');
          meta.className = 'archive-item-meta';
          addAssignmentMeta(meta, assignment.category);
          addAssignmentMeta(
            meta,
            assignment.status,
            assignment.status === 'Selesai' ? 'assignment-status-done' : 'assignment-status-progress'
          );
          if (assignment.dueDate) addAssignmentMeta(meta, `Tenggat ${formatAssignmentDate(assignment.dueDate)}`);
          const links = document.createElement('div');
          links.className = 'archive-item-links';
          if (assignment.downloadUrl && assignment.fileName) {
            const download = document.createElement('a');
            download.className = 'archive-file-link';
            download.href = assignment.downloadUrl;
            download.textContent = `Unduh ${assignment.fileName}${assignment.fileSize ? ` · ${formatFileSize(assignment.fileSize)}` : ''}`;
            links.append(download);
          }
          if (assignment.externalUrl) {
            const externalLink = document.createElement('a');
            externalLink.className = 'archive-external-link';
            externalLink.href = assignment.externalUrl;
            externalLink.target = '_blank';
            externalLink.rel = 'noopener noreferrer';
            externalLink.textContent = 'Buka tautan tugas ↗';
            links.append(externalLink);
          }
          if (assignment.createdAt) {
            const createdDate = new Date(assignment.createdAt);
            if (!Number.isNaN(createdDate.getTime())) {
              const added = document.createElement('span');
              added.className = 'archive-added-date';
              added.textContent = `Ditambahkan ${new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }).format(createdDate)}`;
              links.append(added);
            }
          }
          details.append(title, description, meta, links);
          item.append(details);

          if (isAssignmentAdmin) {
            const actions = document.createElement('div');
            actions.className = 'archive-item-actions';
            [['edit', 'Edit'], ['delete', 'Hapus']].forEach(([action, label]) => {
              const button = document.createElement('button');
              button.type = 'button';
              button.dataset.action = action;
              button.dataset.assignmentId = assignment.id;
              button.textContent = label;
              actions.append(button);
            });
            item.append(actions);
          }
          contents.append(item);
        });

        folder.append(summary, contents);
        return folder;
      });
    if (folders.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'archive-empty';
      empty.textContent = 'Tidak ada tugas yang cocok dengan pencarian.';
      assignmentList.replaceChildren(empty);
      return;
    }
    assignmentList.replaceChildren(...folders);
  };

  const resetAssignmentForm = () => {
    editingAssignmentId = null;
    assignmentForm.reset();
    assignmentSemester.value = '5';
    assignmentFile.required = false;
    assignmentSubmit.textContent = 'Simpan tugas';
    assignmentCancel.hidden = true;
  };

  const setAssignmentAdminState = authenticated => {
    isAssignmentAdmin = authenticated;
    assignmentForm.hidden = !authenticated;
    assignmentLoginLink.hidden = authenticated;
    if (!authenticated) resetAssignmentForm();
    renderAssignments();
  };

  assignmentList.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button || !isAssignmentAdmin) return;
    const assignment = assignments.find(item => item.id === button.dataset.assignmentId);
    if (!assignment) {
      setAssignmentFeedback('Tugas tidak ditemukan. Muat ulang halaman dan coba lagi.', true);
      return;
    }
    if (button.dataset.action === 'edit') {
      editingAssignmentId = assignment.id;
      assignmentSemester.value = String(assignment.semester || 5);
      assignmentCourse.value = assignment.course;
      assignmentTitle.value = assignment.title;
      assignmentCategory.value = assignment.category || 'Tugas';
      assignmentDescription.value = assignment.description;
      assignmentDueDate.value = assignment.dueDate || '';
      assignmentStatus.value = assignment.status || 'Dalam proses';
      assignmentExternalUrl.value = assignment.externalUrl || '';
      assignmentFile.value = '';
      assignmentFile.required = false;
      assignmentSubmit.textContent = 'Simpan perubahan';
      assignmentCancel.hidden = false;
      assignmentForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setAssignmentFeedback(`Sedang mengedit: ${assignment.title}`);
      return;
    }
    if (button.dataset.action === 'delete'
        && window.confirm(`Hapus tugas "${assignment.title}" dari arsip?`)) {
      button.disabled = true;
      try {
        assignments = await assignmentRequest(`/api/assignments/${encodeURIComponent(assignment.id)}`, {
          method: 'DELETE'
        });
        if (editingAssignmentId === assignment.id) resetAssignmentForm();
        renderAssignments();
        setAssignmentFeedback('Tugas berhasil dihapus.');
      } catch (error) {
        setAssignmentFeedback(`Tugas tidak dapat dihapus: ${error.message}`, true);
        button.disabled = false;
      }
    }
  });

  assignmentForm.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(assignmentForm);
    const wasEditing = Boolean(editingAssignmentId);
    assignmentSubmit.disabled = true;
    try {
      assignments = await assignmentRequest(
        wasEditing ? `/api/assignments/${encodeURIComponent(editingAssignmentId)}` : '/api/assignments',
        {
          method: wasEditing ? 'PUT' : 'POST',
          body: formData
        }
      );
      renderAssignments();
      resetAssignmentForm();
      setAssignmentFeedback(wasEditing ? 'Tugas berhasil diperbarui.' : 'Tugas berhasil ditambahkan.');
    } catch (error) {
      setAssignmentFeedback(`Tugas tidak dapat disimpan: ${error.message}`, true);
    } finally {
      assignmentSubmit.disabled = false;
    }
  });

  assignmentCancel.addEventListener('click', () => {
    resetAssignmentForm();
    setAssignmentFeedback('Edit dibatalkan.');
  });

  window.addEventListener('portfolio-admin-state', event => {
    setAssignmentAdminState(Boolean(event.detail.authenticated));
  });
  [assignmentSearch, courseFilter].forEach(filter => {
    if (filter) filter.addEventListener('input', renderAssignments);
  });
  if (courseFilter) courseFilter.addEventListener('change', renderAssignments);

  Promise.all([
    assignmentRequest('/api/assignments'),
    assignmentRequest('/api/session')
  ]).then(([savedAssignments, session]) => {
    if (!Array.isArray(savedAssignments)) throw new Error('Data arsip tugas dari server tidak valid.');
    assignments = savedAssignments;
    setAssignmentAdminState(Boolean(session.authenticated));
    renderAssignments();
    setAssignmentFeedback('');
  }).catch(error => {
    assignmentCount.textContent = 'Gagal dimuat';
    setAssignmentFeedback(`Arsip tugas tidak dapat dimuat: ${error.message}`, true);
  });
}

