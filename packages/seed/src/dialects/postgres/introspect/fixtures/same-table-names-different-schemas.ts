import { IntrospectedStructure } from '../introspectDatabase.js'

export const introspection: IntrospectedStructure = {
  tables: [
    {
      id: 'public.Comment',
      name: 'Comment',
      schema: 'public',
      rows: null,
      bytes: 0,
      partitioned: false,
      columns: [
        {
          id: 'public.Comment.content',
          name: 'content',
          type: 'text',
          typeId: 'pg_catalog.text',
          table: 'Comment',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'S',
          constraints: [],
        },
        {
          id: 'public.Comment.id',
          name: 'id',
          type: 'uuid',
          typeId: 'pg_catalog.text',
          table: 'Comment',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'U',
          constraints: ['p'],
        },
        {
          id: 'public.Comment.postId',
          name: 'postId',
          type: 'uuid',
          typeId: 'pg_catalog.text',
          table: 'Comment',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'U',
          constraints: ['f'],
        },
        {
          id: 'public.Comment.userId',
          name: 'userId',
          type: 'uuid',
          typeId: 'pg_catalog.text',
          table: 'Comment',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'U',
          constraints: ['f'],
        },
        {
          id: 'public.Comment.writtenAt',
          name: 'writtenAt',
          type: 'timestamptz',
          typeId: 'pg_catalog.text',
          table: 'Comment',
          schema: 'public',
          nullable: true,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'D',
          constraints: [],
        },
      ],
      parents: [
        {
          id: 'Comment_postId_fkey',
          fkTable: 'public.Comment',
          keys: [
            {
              fkColumn: 'postId',
              fkType: 'uuid',
              targetColumn: 'id',
              targetType: 'uuid',
              nullable: false,
            },
          ],
          targetTable: 'public.Post',
        },
        {
          id: 'Comment_userId_fkey',
          fkTable: 'public.Comment',
          keys: [
            {
              fkColumn: 'userId',
              fkType: 'uuid',
              targetColumn: 'id',
              targetType: 'uuid',
              nullable: false,
            },
          ],
          targetTable: 'public.User',
        },
      ],
      children: [],
      primaryKeys: {
        tableId: 'public.Comment',
        schema: 'public',
        table: 'Comment',
        dirty: false,
        keys: [
          {
            name: 'id',
            type: 'uuid',
          },
        ],
      },
    },
    {
      id: 'public.Post',
      name: 'Post',
      schema: 'public',
      rows: null,
      bytes: 0,
      partitioned: false,
      columns: [
        {
          id: 'public.Post.content',
          name: 'content',
          type: 'text',
          typeId: 'pg_catalog.text',
          table: 'Post',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'S',
          constraints: [],
        },
        {
          id: 'public.Post.createdBy',
          name: 'createdBy',
          type: 'uuid',
          typeId: 'pg_catalog.text',
          table: 'Post',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'U',
          constraints: ['f'],
        },
        {
          id: 'public.Post.id',
          name: 'id',
          type: 'uuid',
          typeId: 'pg_catalog.text',
          table: 'Post',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'U',
          constraints: ['p'],
        },
        {
          id: 'public.Post.title',
          name: 'title',
          type: 'text',
          typeId: 'pg_catalog.text',
          table: 'Post',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'S',
          constraints: [],
        },
      ],
      parents: [
        {
          id: 'Post_createdBy_fkey',
          fkTable: 'public.Post',
          keys: [
            {
              fkColumn: 'createdBy',
              fkType: 'uuid',
              targetColumn: 'id',
              targetType: 'uuid',
              nullable: false,
            },
          ],
          targetTable: 'public.User',
        },
      ],
      children: [
        {
          id: 'Comment_postId_fkey',
          fkTable: 'public.Comment',
          keys: [
            {
              fkColumn: 'postId',
              fkType: 'uuid',
              targetColumn: 'id',
              targetType: 'uuid',
              nullable: false,
            },
          ],
          targetTable: 'public.Post',
        },
      ],
      primaryKeys: {
        tableId: 'public.Post',
        schema: 'public',
        table: 'Post',
        dirty: false,
        keys: [
          {
            name: 'id',
            type: 'uuid',
          },
        ],
      },
    },
    {
      id: 'auth.User',
      name: 'User',
      schema: 'auth',
      rows: null,
      bytes: 0,
      partitioned: false,
      columns: [
        {
          id: 'auth.User.fullName',
          name: 'fullName',
          type: 'text',
          typeId: 'pg_catalog.text',
          table: 'User',
          schema: 'auth',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'S',
          constraints: [],
        },
        {
          id: 'auth.User.id',
          name: 'id',
          type: 'uuid',
          typeId: 'pg_catalog.text',
          table: 'User',
          schema: 'auth',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'U',
          constraints: ['p'],
        },
      ],
      parents: [],
      children: [],
      primaryKeys: {
        tableId: 'auth.User',
        schema: 'auth',
        table: 'User',
        dirty: false,
        keys: [
          {
            name: 'id',
            type: 'uuid',
          },
        ],
      },
    },
    {
      id: 'public.User',
      name: 'User',
      schema: 'public',
      rows: null,
      bytes: 0,
      partitioned: false,
      columns: [
        {
          id: 'public.User.email',
          name: 'email',
          type: 'text',
          typeId: 'pg_catalog.text',
          table: 'User',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'S',
          constraints: ['u'],
        },
        {
          id: 'public.User.id',
          name: 'id',
          type: 'uuid',
          typeId: 'pg_catalog.text',
          table: 'User',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'U',
          constraints: ['p'],
        },
        {
          id: 'public.User.name',
          name: 'name',
          type: 'text',
          typeId: 'pg_catalog.text',
          table: 'User',
          schema: 'public',
          nullable: false,
          default: null,
          generated: 'NEVER',
          identity: null,
          maxLength: null,
          typeCategory: 'S',
          constraints: [],
        },
      ],
      parents: [],
      children: [
        {
          id: 'Comment_userId_fkey',
          fkTable: 'public.Comment',
          keys: [
            {
              fkColumn: 'userId',
              fkType: 'uuid',
              targetColumn: 'id',
              targetType: 'uuid',
              nullable: false,
            },
          ],
          targetTable: 'public.User',
        },
        {
          id: 'Post_createdBy_fkey',
          fkTable: 'public.Post',
          keys: [
            {
              fkColumn: 'createdBy',
              fkType: 'uuid',
              targetColumn: 'id',
              targetType: 'uuid',
              nullable: false,
            },
          ],
          targetTable: 'public.User',
        },
      ],
      primaryKeys: {
        tableId: 'public.User',
        schema: 'public',
        table: 'User',
        dirty: false,
        keys: [
          {
            name: 'id',
            type: 'uuid',
          },
        ],
      },
    },
  ],
  enums: [],
}
