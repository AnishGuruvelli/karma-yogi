package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 100
	cfg.MinConns = 2
	cfg.MaxConnIdleTime = 15 * time.Minute
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.HealthCheckPeriod = 1 * time.Minute
	// Kill any query that runs longer than 10 seconds at the PostgreSQL level.
	cfg.ConnConfig.RuntimeParams["statement_timeout"] = "10000"
	return pgxpool.NewWithConfig(ctx, cfg)
}
