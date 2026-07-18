using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using VSMatch.Data;
using VSMatch.Data.Repositories;
using VSMatch.Options;
using VSMatch.Services.Admin;
using VSMatch.Services.Auth;
using VSMatch.Services.Courts;
using VSMatch.Domain.Moderation;
using VSMatch.Services.Matches;
using VSMatch.Services.Feedback;

var builder = WebApplication.CreateBuilder(args);

// ── Наблюдаемость ─────────────────────────────────────────────
// Serilog: структурные логи (контекст запроса, уровни, шаблоны) в stdout.
builder.Host.UseSerilog((ctx, cfg) => cfg
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"));

// Sentry: включается только если задан SENTRY_DSN (env или конфиг).
var sentryDsn = builder.Configuration["SENTRY_DSN"];
if (!string.IsNullOrWhiteSpace(sentryDsn))
{
    builder.WebHost.UseSentry(o =>
    {
        o.Dsn = sentryDsn;
        o.Environment = builder.Environment.EnvironmentName;
        o.SendDefaultPii = false;
        o.TracesSampleRate = 0.2;   // 20% трейсов производительности
    });
}

// Options
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<VkIdOptions>(builder.Configuration.GetSection("VkId"));
builder.Services.Configure<CorsOptions>(builder.Configuration.GetSection("Cors"));

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
var vkId = builder.Configuration.GetSection("VkId").Get<VkIdOptions>() ?? new VkIdOptions();
AppConfigurationValidator.Validate(jwt, vkId, builder.Environment.IsDevelopment());

var cors = builder.Configuration.GetSection("Cors").Get<CorsOptions>() ?? new CorsOptions();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    if (cors.AllowedOrigins.Length > 0)
        p.WithOrigins(cors.AllowedOrigins).AllowAnyHeader().AllowAnyMethod();
    else if (builder.Environment.IsDevelopment())
        p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    else
        p.WithOrigins("https://vsmatch.ru", "https://www.vsmatch.ru").AllowAnyHeader().AllowAnyMethod();
}));

// EF Core + PostgreSQL
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Repositories
builder.Services.AddScoped<ICourtRepository, CourtRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IMatchRepository, MatchRepository>();

// Services
builder.Services.AddScoped<ICourtService, CourtService>();
builder.Services.AddHostedService<CourtAddressEnricher>();
builder.Services.AddHostedService<OsmCourtImporter>();
builder.Services.AddHostedService<AdminBootstrapper>();
builder.Services.AddHostedService<StaleMatchCleaner>();
builder.Services.AddScoped<IFeedbackService, FeedbackService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAuthorizationHandler, AdminAuthorizationHandler>();
builder.Services.AddScoped<IMatchService, MatchService>();
builder.Services.AddSingleton<IMatchEventHub, InMemoryMatchEventHub>();
builder.Services.AddSingleton<IContentModerator, RegexContentModerator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddSingleton<IVkIdStateStore, InMemoryVkIdStateStore>();
builder.Services.AddHttpClient<IVkIdClient, VkIdClient>();

// JWT auth
builder.Services
    .AddAuthentication(opt =>
    {
        opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opt =>
    {
        opt.RequireHttpsMetadata = false;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });
builder.Services.AddAuthorization(o =>
    o.AddPolicy(AdminPolicy.Name, p => p.Requirements.Add(new AdminRequirement())));

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Введи JWT (без префикса 'Bearer ')",
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
});

var app = builder.Build();

// Автоприменение миграций при старте
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.UseSwagger();
app.UseSwaggerUI();

// Лог каждого запроса: метод, путь, статус, время — структурно.
app.UseSerilogRequestLogging();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();
