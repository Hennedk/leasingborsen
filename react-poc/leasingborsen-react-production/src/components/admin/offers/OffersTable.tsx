import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Trash2, Check, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { EditableOffer } from './useOfferOperations'

interface OffersTableProps {
  editableOffers: EditableOffer[]
  savingOffers: Set<number>
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  onUpdateField: (index: number, field: keyof EditableOffer, value: string) => void
  onSaveOffer: (index: number) => void
  onDeleteOffer: (index: number, offerId?: string) => void
  onDuplicateOffer: (index: number) => void
  onKeyDown: (e: React.KeyboardEvent, index: number) => void
}

const formatPrice = (price?: string) => 
  price ? `${parseFloat(price).toLocaleString('da-DK')} kr` : '–'

export const OffersTable = React.memo<OffersTableProps>(({
  editableOffers,
  savingOffers,
  inputRefs,
  onUpdateField,
  onSaveOffer,
  onDeleteOffer,
  onDuplicateOffer,
  onKeyDown
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pl-0 pr-3 font-medium">Månedspris *</th>
            <th className="text-left py-2 px-3 font-medium">Udbetaling</th>
            <th className="text-left py-2 px-3 font-medium">Periode (mdr)</th>
            <th className="text-left py-2 px-3 font-medium">Km/år</th>
            <th className="text-left py-2 px-3 font-medium w-20">Handlinger</th>
          </tr>
        </thead>
        <tbody>
          {editableOffers.map((offer, index) => (
            <tr 
              key={offer.id ? `offer-${offer.id}` : `new-offer-${index}`} 
              className={`border-b hover:bg-muted/30 ${offer.isNew ? 'bg-muted/10' : ''}`}
            >
              {/* Monthly Price */}
              <td className="py-2 pl-0 pr-3">
                <div className="space-y-1">
                  <Input
                    ref={el => { if (el) inputRefs.current[`${index}-monthly_price`] = el; return undefined }}
                    name={`monthly_price_${index}`}
                    type="number"
                    min="1"
                    max="50000"
                    placeholder="f.eks. 5000"
                    value={offer.monthly_price}
                    onChange={(e) => onUpdateField(index, 'monthly_price', e.target.value)}
                    onFocus={() => onUpdateField(index, 'isEditing', 'true')}
                    onKeyDown={(e) => onKeyDown(e, index)}
                    className={offer.errors?.monthly_price ? 'border-destructive' : ''}
                  />
                  {offer.errors?.monthly_price && (
                    <div className="text-xs text-destructive">{offer.errors.monthly_price}</div>
                  )}
                </div>
              </td>

              {/* First Payment */}
              <td className="py-2 px-3">
                <div className="space-y-1">
                  <Input
                    ref={el => { if (el) inputRefs.current[`${index}-first_payment`] = el; return undefined }}
                    name={`first_payment_${index}`}
                    type="number"
                    min="0"
                    max="500000"
                    placeholder="f.eks. 25000"
                    value={offer.first_payment}
                    onChange={(e) => onUpdateField(index, 'first_payment', e.target.value)}
                    onFocus={() => onUpdateField(index, 'isEditing', 'true')}
                    onKeyDown={(e) => onKeyDown(e, index)}
                    className={offer.errors?.first_payment ? 'border-destructive' : ''}
                  />
                  {offer.errors?.first_payment && (
                    <div className="text-xs text-destructive">{offer.errors.first_payment}</div>
                  )}
                </div>
              </td>

              {/* Period Months */}
              <td className="py-2 px-3">
                <div className="space-y-1">
                  <Input
                    ref={el => { if (el) inputRefs.current[`${index}-period_months`] = el; return undefined }}
                    name={`period_months_${index}`}
                    type="number"
                    min="1"
                    max="120"
                    placeholder="f.eks. 36"
                    value={offer.period_months}
                    onChange={(e) => onUpdateField(index, 'period_months', e.target.value)}
                    onFocus={() => onUpdateField(index, 'isEditing', 'true')}
                    onKeyDown={(e) => onKeyDown(e, index)}
                    className={offer.errors?.period_months ? 'border-destructive' : ''}
                  />
                  {offer.errors?.period_months && (
                    <div className="text-xs text-destructive">{offer.errors.period_months}</div>
                  )}
                </div>
              </td>

              {/* Mileage Per Year */}
              <td className="py-2 px-3">
                <div className="space-y-1">
                  <Input
                    ref={el => { if (el) inputRefs.current[`${index}-mileage_per_year`] = el; return undefined }}
                    name={`mileage_per_year_${index}`}
                    type="number"
                    min="5000"
                    max="50000"
                    placeholder="f.eks. 20000"
                    value={offer.mileage_per_year}
                    onChange={(e) => onUpdateField(index, 'mileage_per_year', e.target.value)}
                    onFocus={() => onUpdateField(index, 'isEditing', 'true')}
                    onKeyDown={(e) => onKeyDown(e, index)}
                    className={offer.errors?.mileage_per_year ? 'border-destructive' : ''}
                  />
                  {offer.errors?.mileage_per_year && (
                    <div className="text-xs text-destructive">{offer.errors.mileage_per_year}</div>
                  )}
                </div>
              </td>

              {/* Actions */}
              <td className="py-2 px-3">
                <div className="flex gap-1">
                  {!offer.isNew && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDuplicateOffer(index)}
                        className="h-6 w-6"
                        title="Dupliker tilbud"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            title="Slet tilbud"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slet tilbud</AlertDialogTitle>
                            <AlertDialogDescription>
                              Er du sikker på, at du vil slette dette tilbud med månedspris på {formatPrice(offer.monthly_price)}/md?
                              <br />
                              Denne handling kan ikke fortrydes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuller</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteOffer(index, offer.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Slet tilbud
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  {offer.isNew && offer.monthly_price.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onSaveOffer(index)}
                      disabled={savingOffers.has(index)}
                      className="h-6 w-6 text-green-600"
                      title={savingOffers.has(index) ? "Gemmer..." : "Gem nyt tilbud"}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editableOffers.length === 1 && editableOffers[0].isNew && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <Plus className="h-4 w-4 mx-auto mb-2" />
          Tilføj det første tilbud ved at udfylde tabellen ovenfor
        </div>
      )}
    </div>
  )
})

OffersTable.displayName = 'OffersTable'