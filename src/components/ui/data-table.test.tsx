import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable, type ColumnDef } from './data-table'

interface Item { id: string; name: string }

const columns: ColumnDef<Item>[] = [
  { header: 'Nombre', cell: (row) => <span>{row.name}</span> },
]

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${i}`, name: `Item ${i}` }))

describe('DataTable – client-side pagination', () => {
  it('renders rows for current page', () => {
    render(<DataTable data={makeItems(20)} columns={columns} pageSize={5} />)
    expect(screen.getAllByText(/Item \d/)).toHaveLength(5)
  })

  it('shows total count in footer', () => {
    render(<DataTable data={makeItems(20)} columns={columns} pageSize={5} />)
    expect(screen.getByText(/de 20/)).toBeInTheDocument()
  })

  it('advances to next page on click', () => {
    render(<DataTable data={makeItems(20)} columns={columns} pageSize={5} />)
    const buttons = screen.getAllByRole('button')
    // Next button is the last one
    fireEvent.click(buttons[buttons.length - 1])
    expect(screen.getByText(/Item 5/)).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="Sin datos" />)
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<DataTable data={[]} columns={columns} isLoading />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('resets to page 1 when search changes', () => {
    render(
      <DataTable
        data={makeItems(20)}
        columns={columns}
        pageSize={5}
        getSearchText={(row) => row.name}
        searchPlaceholder="Buscar"
      />,
    )
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1]) // go to page 2
    const searchInput = screen.getByPlaceholderText('Buscar')
    fireEvent.change(searchInput, { target: { value: 'xyz' } })
    // Page should reset — show "Sin resultados"
    expect(screen.getByText('Sin resultados.')).toBeInTheDocument()
  })
})

describe('DataTable – server-side pagination', () => {
  it('renders provided data without slicing', () => {
    const items = makeItems(15)
    render(
      <DataTable
        data={items}
        columns={columns}
        serverSide
        totalItems={100}
        currentPage={1}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getAllByText(/Item \d/)).toHaveLength(15)
    expect(screen.getByText(/de 100/)).toBeInTheDocument()
  })

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        data={makeItems(15)}
        columns={columns}
        serverSide
        totalItems={30}
        currentPage={1}
        pageSize={15}
        onPageChange={onPageChange}
      />,
    )
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1]) // next button
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables prev button on first page', () => {
    render(
      <DataTable
        data={makeItems(15)}
        columns={columns}
        serverSide
        totalItems={30}
        currentPage={1}
        pageSize={15}
        onPageChange={vi.fn()}
      />,
    )
    const buttons = screen.getAllByRole('button')
    const prevBtn = buttons[0]
    expect(prevBtn).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(
      <DataTable
        data={makeItems(15)}
        columns={columns}
        serverSide
        totalItems={30}
        currentPage={2}
        pageSize={15}
        onPageChange={vi.fn()}
      />,
    )
    const buttons = screen.getAllByRole('button')
    const nextBtn = buttons[buttons.length - 1]
    expect(nextBtn).toBeDisabled()
  })

  it('calls onPageChange with prev page on prev click', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        data={makeItems(15)}
        columns={columns}
        serverSide
        totalItems={30}
        currentPage={2}
        pageSize={15}
        onPageChange={onPageChange}
      />,
    )
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0]) // prev button
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('shows correct page indicator', () => {
    render(
      <DataTable
        data={makeItems(10)}
        columns={columns}
        serverSide
        totalItems={50}
        currentPage={3}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
  })

  it('hides pagination when totalItems <= pageSize', () => {
    render(
      <DataTable
        data={makeItems(5)}
        columns={columns}
        serverSide
        totalItems={5}
        currentPage={1}
        pageSize={15}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})
