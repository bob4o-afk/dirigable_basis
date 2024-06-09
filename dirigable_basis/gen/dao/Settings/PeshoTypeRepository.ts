import { query } from "sdk/db";
import { producer } from "sdk/messaging";
import { extensions } from "sdk/extensions";
import { dao as daoApi } from "sdk/db";

export interface PeshoTypeEntity {
    readonly Id: number;
    Name?: string;
}

export interface PeshoTypeCreateEntity {
    readonly Name?: string;
}

export interface PeshoTypeUpdateEntity extends PeshoTypeCreateEntity {
    readonly Id: number;
}

export interface PeshoTypeEntityOptions {
    $filter?: {
        equals?: {
            Id?: number | number[];
            Name?: string | string[];
        };
        notEquals?: {
            Id?: number | number[];
            Name?: string | string[];
        };
        contains?: {
            Id?: number;
            Name?: string;
        };
        greaterThan?: {
            Id?: number;
            Name?: string;
        };
        greaterThanOrEqual?: {
            Id?: number;
            Name?: string;
        };
        lessThan?: {
            Id?: number;
            Name?: string;
        };
        lessThanOrEqual?: {
            Id?: number;
            Name?: string;
        };
    },
    $select?: (keyof PeshoTypeEntity)[],
    $sort?: string | (keyof PeshoTypeEntity)[],
    $order?: 'asc' | 'desc',
    $offset?: number,
    $limit?: number,
}

interface PeshoTypeEntityEvent {
    readonly operation: 'create' | 'update' | 'delete';
    readonly table: string;
    readonly entity: Partial<PeshoTypeEntity>;
    readonly key: {
        name: string;
        column: string;
        value: number;
    }
}

interface PeshoTypeUpdateEntityEvent extends PeshoTypeEntityEvent {
    readonly previousEntity: PeshoTypeEntity;
}

export class PeshoTypeRepository {

    private static readonly DEFINITION = {
        table: "CODBEX_PESHOTYPE",
        properties: [
            {
                name: "Id",
                column: "PESHOTYPE_ID",
                type: "INTEGER",
                id: true,
                autoIncrement: true,
            },
            {
                name: "Name",
                column: "PESHOTYPE_NAME",
                type: "VARCHAR",
            }
        ]
    };

    private readonly dao;

    constructor(dataSource = "DefaultDB") {
        this.dao = daoApi.create(PeshoTypeRepository.DEFINITION, null, dataSource);
    }

    public findAll(options?: PeshoTypeEntityOptions): PeshoTypeEntity[] {
        return this.dao.list(options);
    }

    public findById(id: number): PeshoTypeEntity | undefined {
        const entity = this.dao.find(id);
        return entity ?? undefined;
    }

    public create(entity: PeshoTypeCreateEntity): number {
        const id = this.dao.insert(entity);
        this.triggerEvent({
            operation: "create",
            table: "CODBEX_PESHOTYPE",
            entity: entity,
            key: {
                name: "Id",
                column: "PESHOTYPE_ID",
                value: id
            }
        });
        return id;
    }

    public update(entity: PeshoTypeUpdateEntity): void {
        const previousEntity = this.findById(entity.Id);
        this.dao.update(entity);
        this.triggerEvent({
            operation: "update",
            table: "CODBEX_PESHOTYPE",
            entity: entity,
            previousEntity: previousEntity,
            key: {
                name: "Id",
                column: "PESHOTYPE_ID",
                value: entity.Id
            }
        });
    }

    public upsert(entity: PeshoTypeCreateEntity | PeshoTypeUpdateEntity): number {
        const id = (entity as PeshoTypeUpdateEntity).Id;
        if (!id) {
            return this.create(entity);
        }

        const existingEntity = this.findById(id);
        if (existingEntity) {
            this.update(entity as PeshoTypeUpdateEntity);
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
            table: "CODBEX_PESHOTYPE",
            entity: entity,
            key: {
                name: "Id",
                column: "PESHOTYPE_ID",
                value: id
            }
        });
    }

    public count(options?: PeshoTypeEntityOptions): number {
        return this.dao.count(options);
    }

    public customDataCount(): number {
        const resultSet = query.execute('SELECT COUNT(*) AS COUNT FROM "CODBEX_PESHOTYPE"');
        if (resultSet !== null && resultSet[0] !== null) {
            if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
                return resultSet[0].COUNT;
            } else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
                return resultSet[0].count;
            }
        }
        return 0;
    }

    private async triggerEvent(data: PeshoTypeEntityEvent | PeshoTypeUpdateEntityEvent) {
        const triggerExtensions = await extensions.loadExtensionModules("dirigable_basis-Settings-PeshoType", ["trigger"]);
        triggerExtensions.forEach(triggerExtension => {
            try {
                triggerExtension.trigger(data);
            } catch (error) {
                console.error(error);
            }            
        });
        producer.topic("dirigable_basis-Settings-PeshoType").send(JSON.stringify(data));
    }
}
