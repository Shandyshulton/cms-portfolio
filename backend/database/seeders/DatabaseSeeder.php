<?php

namespace Database\Seeders;

use App\Models\Certification;
use App\Models\Education;
use App\Models\Experience;
use App\Models\Project;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(['email' => env('ADMIN_EMAIL', 'admin@portfolio.test')], [
            'name' => env('ADMIN_NAME', 'Admin User'),
            'password' => Hash::make(env('ADMIN_PASSWORD', 'password')),
        ]);

        $this->seedProjects();
        $this->seedExperiences();
        $this->seedEducations();
        $this->seedCertifications();
        $this->seedSettings();
    }

    private function seedProjects(): void
    {
        $slugs = ['imoca-company-profile', 'petly-pet-care-ecommerce', 'easy-saving', 'playstation-rental-management-system'];
        Project::query()->whereNotIn('slug', $slugs)->get()->each(function (Project $project) {
            $project->images()->get()->each->delete();
            $project->delete();
        });

        $projects = [
            ['imoca-company-profile', 'IMOCA Company Profile Website', 'Company Profile', 'Full Stack Developer', 'May 2026', 'Completed', 'Company profile with a public website, dynamic content flow, and backend-powered data management.', 'A full-featured company profile website with modern UI and dynamic content management. Built with React.js frontend connected to a Golang backend with MySQL database.', ['Responsive company profile layout', 'Dynamic content via Golang REST API', 'MySQL-backed data management', 'Modern UI with Tailwind CSS'], ['Tailwind CSS', 'React.js', 'Golang', 'MySQL'], 'https://github.com/Shandyshulton/petly', null, true, 1,
                'Company profile dengan website publik, alur konten dinamis, dan pengelolaan data melalui backend.', 'Website company profile lengkap dengan UI modern dan manajemen konten dinamis. Dibangun dengan frontend React.js yang terhubung ke backend Golang dengan database MySQL.', ['Tampilan company profile yang responsif', 'Konten dinamis via Golang REST API', 'Manajemen data berbasis MySQL', 'UI modern dengan Tailwind CSS']],
            ['petly-pet-care-ecommerce', 'Petly - Pet Care E-Commerce', 'E-Commerce', 'Front-End Developer', 'December 2025', 'Completed', 'Pet care store interface focused on browsing products, cart interaction, and checkout experience.', 'A full-featured pet care e-commerce platform with product listings, shopping cart, and checkout flows. Integrated responsive Tailwind CSS interfaces with a Laravel back-end for dynamic content rendering.', ['Responsive product listing with filter/search', 'Shopping cart and checkout UI components', 'Seamless Laravel back-end integration', 'Dynamic data rendering via API calls'], ['Tailwind CSS', 'Laravel', 'MySQL'], 'https://github.com/Shandyshulton/petly', null, false, 2,
                'Antarmuka toko perawatan hewan yang berfokus pada browsing produk, interaksi keranjang, dan pengalaman checkout.', 'Platform e-commerce perawatan hewan lengkap dengan daftar produk, keranjang belanja, dan alur checkout. Mengintegrasikan antarmuka Tailwind CSS yang responsif dengan backend Laravel untuk rendering konten dinamis.', ['Daftar produk responsif dengan filter/pencarian', 'Komponen UI keranjang belanja dan checkout', 'Integrasi seamless dengan backend Laravel', 'Rendering data dinamis via panggilan API']],
            ['easy-saving', 'EasySaving', 'Finance Tracker', 'Front-End Developer', 'October 2025', 'Live on VPS', 'Savings tracker interface for planning goals, monitoring balances, and reviewing transaction history.', 'A web app that helps users record savings, monitor financial goal progress, and review transaction history through a simple, easy-to-understand interface.', ['Compact dashboard for total savings and goal progress', 'Savings goal management with achievement status', 'Readable income and expense history', 'Responsive UI with reusable components'], ['React.js', 'Vite', 'Tailwind CSS', 'JavaScript'], null, 'https://easysaving.asia/', true, 3,
                'Antarmuka pencatat tabungan untuk merencanakan target, memantau saldo, dan melihat riwayat transaksi.', 'Aplikasi web untuk membantu pengguna mencatat tabungan, memantau progress target finansial, dan melihat riwayat transaksi dalam tampilan yang sederhana dan mudah dipahami.', ['Dashboard ringkas untuk melihat total tabungan dan progress target', 'Pengelolaan target tabungan dengan status pencapaian', 'Riwayat pemasukan dan pengeluaran yang mudah dipindai', 'UI responsif dengan komponen yang reusable']],
            ['playstation-rental-management-system', 'PlayStation Rental Management System', 'Management System', 'Full Stack Developer', 'June 2025', 'Completed', 'Rental dashboard for managing PlayStation units, customers, transactions, and operational records.', 'A web-based PlayStation rental management system featuring multi-user authentication, comprehensive CRUD operations, transaction monitoring, and relational database management for customers and rental records.', ['Multi-user authentication with role-based access control', 'Transaction monitoring dashboard with real-time stats', 'Relational database design for customers and rentals', 'Reduced manual record-keeping with digital automation'], ['Laravel', 'MySQL', 'Bootstrap'], 'https://github.com/Shandyshulton/Sistem-Manajemen-Rental-PS', null, false, 4,
                'Dashboard rental untuk mengelola unit PlayStation, pelanggan, transaksi, dan catatan operasional.', 'Sistem manajemen rental PlayStation berbasis web dengan autentikasi multi-pengguna, operasi CRUD lengkap, pemantauan transaksi, dan manajemen database relasional untuk pelanggan dan catatan sewa.', ['Autentikasi multi-pengguna dengan kontrol akses berbasis peran', 'Dashboard pemantauan transaksi dengan statistik real-time', 'Desain database relasional untuk pelanggan dan sewa', 'Mengurangi pencatatan manual dengan otomasi digital']],
        ];

        foreach ($projects as [$slug, $title, $category, $role, $date, $statusText, $summaryEn, $descEn, $highlightsEn, $stacks, $repo, $live, $featured, $order, $summaryId, $descId, $highlightsId]) {
            $project = Project::updateOrCreate(['slug' => $slug], [
                'client_name' => $role,
                'category' => $category,
                'status' => 'published',
                'is_featured' => $featured,
                'stacks' => $stacks,
                'live_url' => $live,
                'repository_url' => $repo,
                'sort_order' => $order,
                'published_at' => now(),
            ]);

            $project->translations()->updateOrCreate(['locale' => 'en'], [
                'title' => $title,
                'summary' => $summaryEn,
                'description' => "{$descEn}\n\nRole: {$role}. Date: {$date}. Status: {$statusText}.",
                'highlights' => $highlightsEn,
            ]);

            $project->translations()->updateOrCreate(['locale' => 'id'], [
                'title' => $title,
                'summary' => $summaryId,
                'description' => "{$descId}\n\nRole: {$role}. Date: {$date}. Status: {$statusText}.",
                'highlights' => $highlightsId,
            ]);
        }
    }

    private function seedExperiences(): void
    {
        Experience::query()->delete();
        $items = [
            ['PT Indonesia Satu Tujuh (INA17)', 'Full Stack Developer Intern', 'Internship', 'Jakarta, Indonesia', '2026-02-01', null, true, ['Go', 'Gin', 'Laravel', 'MySQL', 'React.js', 'Git', 'REST API'], 'Contributed significantly to full-stack web application development, taking charge of backend system logic, database optimization, and modern feature integration.', ['Developed and optimized backend architectures and RESTful APIs utilizing Go (Gin framework) and Laravel.', 'Designed scalable MySQL relational database schemas to enhance internal system workflows.', 'Implemented dynamic multi-language localization and enhanced internal CMS modules.', 'Strengthened API ecosystem security with token expiration and 401 handling.', 'Collaborated with Git/GitLab and Agile project tracking.'], 'Berkontribusi signifikan dalam pengembangan aplikasi web full-stack, bertanggung jawab atas logika sistem backend, optimasi database, dan integrasi fitur modern.', ['Mengembangkan dan mengoptimalkan backend serta RESTful API menggunakan Go (Gin) dan Laravel.', 'Merancang skema database MySQL yang skalabel.', 'Mengimplementasikan lokalisasi multi-bahasa dinamis dan meningkatkan modul CMS internal.', 'Memperkuat keamanan API melalui token expiration dan handling 401.', 'Berkolaborasi menggunakan Git/GitLab dan Agile tracking.']],
            ['Dunamis Indonesia', 'Video Editor Intern', 'Internship', 'Jakarta, Indonesia', '2025-01-01', '2025-12-31', false, ['Adobe Premiere', 'After Effects', 'Figma', 'Content Creation'], 'Interned as a Video Editor at Dunamis Indonesia, producing and editing video content for internal communications, training materials, and corporate presentations.', ['Edited corporate training and communication videos', 'Created motion graphics and visual assets', 'Managed project timelines and asset organization', 'Collaborated on content direction', 'Ensured brand consistency'], 'Magang sebagai Video Editor di Dunamis Indonesia, memproduksi dan mengedit konten video untuk komunikasi internal, materi pelatihan, dan presentasi perusahaan.', ['Mengedit video pelatihan dan komunikasi perusahaan', 'Membuat motion graphics dan aset visual', 'Mengelola timeline dan aset proyek', 'Berkolaborasi dalam arahan konten', 'Menjaga konsistensi brand']],
            ['LB LIA Language Institute', 'English Language Course', 'Course', 'Jakarta, Indonesia', '2024-02-01', '2024-02-01', false, ['English Communication', 'Business Writing', 'Professional Presentation'], 'Completed an Upper-Intermediate English conversation course at LB LIA to improve workplace communication skills.', ['Completed Upper-Intermediate curriculum', 'Practiced business and professional English', 'Improved presentation and verbal communication', 'Engaged in discussions and role-play scenarios'], 'Menyelesaikan kursus percakapan bahasa Inggris Upper-Intermediate di LB LIA untuk meningkatkan komunikasi profesional.', ['Menyelesaikan kurikulum Upper-Intermediate', 'Berlatih komunikasi bisnis dan profesional', 'Meningkatkan kemampuan presentasi dan komunikasi verbal', 'Mengikuti diskusi dan role-play']],
            ['BNCC (Bina Nusantara Computer Club)', 'Member - Team Project Management (TPM)', 'Organization', 'BINUS University', '2023-08-01', null, true, ['Laravel', 'Jira', 'Team Collaboration', 'Project Management'], 'Active member of BNCC assigned to Team Project Management, contributing as a Back-End Developer and gaining front-end exposure.', ['Assigned as Back-End Developer using Laravel', 'Gained exposure to front-end development and UI integration', 'Learned scheduling and task management with Jira', 'Collaborated with cross-functional student project teams'], 'Anggota aktif BNCC pada divisi Team Project Management, berkontribusi sebagai Back-End Developer dan mendapat eksposur front-end.', ['Ditugaskan sebagai Back-End Developer menggunakan Laravel', 'Mendapat pengalaman front-end dan integrasi UI', 'Mempelajari scheduling dan task management dengan Jira', 'Berkolaborasi dalam tim proyek mahasiswa']],
        ];

        foreach ($items as $index => [$company, $role, $model, $location, $start, $end, $current, $skills, $descEn, $hiEn, $descId, $hiId]) {
            Experience::create([
                'company_name' => $company,
                'role' => $role,
                'work_model' => $model,
                'location' => $location,
                'start_date' => $start,
                'end_date' => $current ? null : $end,
                'is_current' => $current,
                'status' => 'published',
                'skills' => $skills,
                'translations' => ['en' => ['description' => $descEn, 'highlights' => $hiEn], 'id' => ['description' => $descId, 'highlights' => $hiId]],
                'sort_order' => $index + 1,
            ]);
        }
    }

    private function seedEducations(): void
    {
        Education::query()->delete();
        Education::create(['institution_name' => 'Bina Nusantara University (BINUS)', 'degree' => 'Computer Science - Database Technology', 'field_of_study' => 'Database Technology', 'location' => 'Indonesia', 'start_date' => '2023-08-01', 'end_date' => '2027-08-01', 'status' => 'published', 'translations' => ['en' => ['description' => "Pursuing a Bachelor's degree in Computer Science with a specialization in Database Technology. Engaged in academic projects, club activities, and hands-on web development work.", 'highlights' => ['Database Technology Specialization', 'Active Member of BNCC', 'Full-Stack Project Development']], 'id' => ['description' => 'Menempuh gelar Sarjana Ilmu Komputer dengan spesialisasi Teknologi Basis Data. Terlibat dalam proyek akademik, kegiatan klub, dan pengembangan web langsung.', 'highlights' => ['Spesialisasi Teknologi Basis Data', 'Anggota Aktif BNCC', 'Pengembangan Proyek Full-Stack']]], 'sort_order' => 1]);
        Education::create(['institution_name' => 'SMK Telkom Jakarta', 'degree' => 'Software Engineering', 'field_of_study' => 'Software Engineering', 'location' => 'Jakarta, Indonesia', 'start_date' => '2020-07-01', 'end_date' => '2023-06-01', 'status' => 'published', 'translations' => ['en' => ['description' => 'Completed a 3-year vocational program focused on Software Engineering fundamentals, including programming, web development, and software project management.', 'highlights' => ['Software Engineering Fundamentals', 'Web Development Basics', 'Active in Student Council (OSIS)']], 'id' => ['description' => 'Menyelesaikan program vokasi 3 tahun berfokus pada dasar Rekayasa Perangkat Lunak, pemrograman, pengembangan web, dan manajemen proyek software.', 'highlights' => ['Dasar-dasar Rekayasa Perangkat Lunak', 'Dasar Pengembangan Web', 'Aktif di OSIS']]], 'sort_order' => 2]);
    }

    private function seedCertifications(): void
    {
        Certification::query()->delete();
        foreach ([['BNSP Junior Web Developer Certificate', 'Telkom DigiUp', '2022-12-01'], ['English Conversation for Employees: Upper-Intermediate', 'LB LIA Language Institute', '2024-02-01'], ['Belajar Dasar Artificial Intelligence', 'Dicoding Indonesia', '2025-12-01']] as $index => [$name, $issuer, $date]) {
            Certification::create(['name' => $name, 'issuer' => $issuer, 'issued_at' => $date, 'status' => 'published', 'skills' => [], 'translations' => ['en' => ['description' => "{$name} issued by {$issuer}."], 'id' => ['description' => "{$name} diterbitkan oleh {$issuer}."]], 'sort_order' => $index + 1]);
        }
    }

    private function seedSettings(): void
    {
        foreach ([
            ['general', 'profile', ['name' => 'Shandy Shulton Shihab', 'headline' => 'Full Stack Developer', 'email' => 'ssshandy60@gmail.com', 'phone' => '+6281212181182', 'location' => 'Jakarta, Indonesia', 'linkedin' => 'https://www.linkedin.com/in/shandy-shulton-shihab-73a25922a/', 'github' => 'https://github.com/Shandyshulton', 'summary' => 'Computer Science undergraduate at Binus University with hands-on experience in building responsive, high-performance web applications. Dedicated to delivering clean UI implementation, maintainable code structures, and scalable design systems that optimize user experience.']],
            ['home', 'content', ['greeting' => 'Hello, I am', 'available_text' => 'Available for internship and freelance work', 'about_label' => 'About', 'about_title' => 'Building reliable web experiences with clean systems', 'about_paragraph_1' => 'I focus on responsive interfaces, maintainable backend logic, and database-backed products that are comfortable to use.', 'about_paragraph_2' => 'My work combines full-stack implementation, content management, and careful UI detail for real-world workflows.']],
            ['contact', 'content', ['section_label' => 'Contact', 'title' => 'Let us work together', 'intro' => 'I am currently open to internship opportunities, freelance projects, and collaborations. Feel free to reach out.']],
            ['contact', 'form', ['recipient_email' => 'ssshandy60@gmail.com', 'success_title' => 'Message sent', 'success_text' => 'Thank you. I will reply as soon as possible.']],
            ['localization', 'default_language', ['value' => 'id']],
            ['api', 'public_api_enabled', ['value' => true]],
            ['security', 'session_timeout_minutes', ['value' => 120]],
        ] as [$group, $key, $value]) {
            Setting::updateOrCreate(['group' => $group, 'key' => $key], ['value' => $value]);
        }
    }
}
