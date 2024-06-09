import { query } from "sdk/db";
import { producer } from "sdk/messaging";
import { extensions } from "sdk/extensions";
import { dao as daoApi } from "sdk/db";

export interface PeshoEntity {
    readonly Id: number;
    Name?: string;
    HowLongUntilDeath?: number;
    PeshoType?: number;
    Product?: number;
}

export interface PeshoCreateEntity {
    readonly Name?: string;
    readonly HowLongUntilDeath?: number;
    readonly PeshoType?: number;
    readonly Product?: number;
}

export interface PeshoUpdateEntity extends PeshoCreateEntity {
    readonly Id: number;
}

export interface PeshoEntityOptions {
    $filter?: {
        equals?: {
            Id?: number | number[];
            Name?: string | string[];
            HowLongUntilDeath?: number | number[];
            PeshoType?: number | number[];
            Product?: number | number[];
        };
        notEquals?: {
            Id?: number | number[];
            Name?: string | string[];
            HowLongUntilDeath?: number | number[];
            PeshoType?: number | number[];
            Product?: number | number[];
        };
        contains?: {
            Id?: number;
            Name?: string;
            HowLongUntilDeath?: number;
            PeshoType?: number;
            Product?: number;
        };
        greaterThan?: {
            Id?: number;
            Name?: string;
            HowLongUntilDeath?: number;
            PeshoType?: number;
            Product?: number;
        };
        greaterThanOrEqual?: {
            Id?: number;
            Name?: string;
            HowLongUntilDeath?: number;
            PeshoType?: number;
            Product?: number;
        };
        lessThan?: {
            Id?: number;
            Name?: string;
            HowLongUntilDeath?: number;
            PeshoType?: number;
            Product?: number;
        };
        lessThanOrEqual?: {
            Id?: number;
            Name?: string;
            HowLongUntilDeath?: number;
            PeshoType?: number;
            Product?: number;
        };
    },
    $select?: (keyof PeshoEntity)[],
    $sort?: string | (keyof PeshoEntity)[],
    $order?: 'asc' | 'desc',
    $offset?: number,
    $limit?: number,
}

interface PeshoEntityEvent {
    readonly operation: 'create' | 'update' | 'delete';
    readonly table: string;
    readonly entity: Partial<PeshoEntity>;
    readonly key: {
        name: string;
        column: string;
        value: number;
    }
}

interface PeshoUpdateEntityEvent extends PeshoEntityEvent {
    readonly previousEntity: PeshoEntity;
}

export class PeshoRepository {

    private static readonly DEFINITION = {
        table: "CODBEX_PESHO",
        properties: [
            {
                name: "Id",
                column: "PESHO_ID",
                type: "INTEGER",
                id: true,
                autoIncrement: true,
            },
            {
                name: "Name",
                column: "PESHO_NAME",
                type: "VARCHAR",
            },
            {
                name: "HowLongUntilDeath",
                column: "PESHO_HOWLONGUNTILDEATH",
                type: "INTEGER",
            },
            {
                name: "PeshoType",
                column: "PESHO_PESHOTYPE",
                type: "INTEGER",
            },
            {
                name: "Product",
                column: "PESHO_PRODUCT",
                type: "INTEGER",
            }
        ]
    };

    private readonly dao;

    constructor(dataSource = "DefaultDB") {
        this.dao = daoApi.create(PeshoRepository.DEFINITION, null, dataSource);
    }

    public findAll(options?: PeshoEntityOptions): PeshoEntity[] {
        return this.dao.list(options);
    }

    public findById(id: number): PeshoEntity | undefined {
        const entity = this.dao.find(id);
        return entity ?? undefined;
    }

    public create(entity: PeshoCreateEntity): number {
        const id = this.dao.insert(entity);
        this.triggerEvent({
            operation: "create",
            table: "CODBEX_PESHO",
            entity: entity,
            key: {
                name: "Id",
                column: "PESHO_ID",
                value: id
            }
        });
        return id;
    }

    public update(entity: PeshoUpdateEntity): void {
        const previousEntity = this.findById(entity.Id);
        this.dao.update(entity);
        this.triggerEvent({
            operation: "update",
            table: "CODBEX_PESHO",
            entity: entity,
            previousEntity: previousEntity,
            key: {
                name: "Id",
                column: "PESHO_ID",
                value: entity.Id
            }
        });
    }

    public upsert(entity: PeshoCreateEntity | PeshoUpdateEntity): number {
        const id = (entity as PeshoUpdateEntity).Id;
        if (!id) {
            return this.create(entity);
        }

        const existingEntity = this.findById(id);
        if (existingEntity) {
            this.update(entity as PeshoUpdateEntity);
            return id;
        } else {
            return this.create(entity);
        }
    }

    public deleteById(id: number): void {
        const entity = this.dao.find(id);
        this.dao.remove(id);
        this.triggerEvent({
            operation: "delete",
            table: "CODBEX_PESHO",
            entity: entity,
            key: {
                name: "Id",
                column: "PESHO_ID",
                value: id
            }
        });
    }

    public count(options?: PeshoEntityOptions): number {
        return this.dao.count(options);
    }

    public customDataCount(): number {
        const resultSet = query.execute('SELECT COUNT(*) AS COUNT FROM "CODBEX_PESHO"');
        if (resultSet !== null && resultSet[0] !== null) {
            if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
                return resultSet[0].COUNT;
            } else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
                return resultSet[0].count;
            }
        }
        return 0;
    }

    private async triggerEvent(data: PeshoEntityEvent | PeshoUpdateEntityEvent) {
        const triggerExtensions = await extensions.loadExtensionModules("dirigable_basis-Pesho-Pesho", ["trigger"]);
        triggerExtensions.forEach(triggerExtension => {
            try {
                triggerExtension.trigger(data);
            } catch (error) {
                console.error(error);
            }            
        });
        producer.topic("dirigable_basis-Pesho-Pesho").send(JSON.stringify(data));
    }
}
